/** @odoo-module **/

import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const { DateTime } = luxon;

const EU_COUNTRIES = [
    'BE','BG','CZ','DK','DE','EE','IE','GR','ES','FR','HR','IT',
    'CY','LV','LT','LU','HU','MT','NL','AT','PL','PT','RO','SI',
    'SK','FI','SE'
];

const ISO3_TO_ISO2 = {
    AFG:"AF",ALB:"AL",DZA:"DZ",AND:"AD",AGO:"AO",ATG:"AG",ARG:"AR",ARM:"AM",
    AUS:"AU",AUT:"AT",AZE:"AZ",BHS:"BS",BHR:"BH",BGD:"BD",BRB:"BB",BLR:"BY",
    BEL:"BE",BLZ:"BZ",BEN:"BJ",BTN:"BT",BOL:"BO",BIH:"BA",BWA:"BW",BRA:"BR",
    BRN:"BN",BGR:"BG",BFA:"BF",BDI:"BI",CPV:"CV",KHM:"KH",CMR:"CM",CAN:"CA",
    CAF:"CF",TCD:"TD",CHL:"CL",CHN:"CN",COL:"CO",COM:"KM",COD:"CD",COG:"CG",
    CRI:"CR",CIV:"CI",HRV:"HR",CUB:"CU",CYP:"CY",CZE:"CZ",DNK:"DK",DJI:"DJ",
    DOM:"DO",ECU:"EC",EGY:"EG",SLV:"SV",GNQ:"GQ",ERI:"ER",EST:"EE",SWZ:"SZ",
    ETH:"ET",FJI:"FJ",FIN:"FI",FRA:"FR",GAB:"GA",GMB:"GM",GEO:"GE",DEU:"DE",
    GHA:"GH",GRC:"GR",GRD:"GD",GTM:"GT",GIN:"GN",GNB:"GW",GUY:"GY",HTI:"HT",
    HND:"HN",HUN:"HU",ISL:"IS",IND:"IN",IDN:"ID",IRN:"IR",IRQ:"IQ",IRL:"IE",
    ISR:"IL",ITA:"IT",JAM:"JM",JPN:"JP",JOR:"JO",KAZ:"KZ",KEN:"KE",PRK:"KP",
    KOR:"KR",KWT:"KW",KGZ:"KG",LAO:"LA",LVA:"LV",LBN:"LB",LSO:"LS",LBR:"LR",
    LBY:"LY",LIE:"LI",LTU:"LT",LUX:"LU",MDG:"MG",MWI:"MW",MYS:"MY",MDV:"MV",
    MLI:"ML",MLT:"MT",MRT:"MR",MUS:"MU",MEX:"MX",MDA:"MD",MCO:"MC",MNG:"MN",
    MNE:"ME",MAR:"MA",MOZ:"MZ",MMR:"MM",NAM:"NA",NPL:"NP",NLD:"NL",NZL:"NZ",
    NIC:"NI",NER:"NE",NGA:"NG",MKD:"MK",NOR:"NO",OMN:"OM",PAK:"PK",PAN:"PA",
    PNG:"PG",PRY:"PY",PER:"PE",PHL:"PH",POL:"PL",PRT:"PT",QAT:"QA",ROU:"RO",
    RUS:"RU",RWA:"RW",KNA:"KN",LCA:"LC",VCT:"VC",WSM:"WS",SMR:"SM",STP:"ST",
    SAU:"SA",SEN:"SN",SRB:"RS",SLE:"SL",SGP:"SG",SVK:"SK",SVN:"SI",SLB:"SB",
    SOM:"SO",ZAF:"ZA",SSD:"SS",ESP:"ES",LKA:"LK",SDN:"SD",SUR:"SR",SWE:"SE",
    CHE:"CH",SYR:"SY",TWN:"TW",TJK:"TJ",TZA:"TZ",THA:"TH",TLS:"TL",TGO:"TG",
    TON:"TO",TTO:"TT",TUN:"TN",TUR:"TR",TKM:"TM",TUV:"TV",UGA:"UG",UKR:"UA",
    ARE:"AE",GBR:"GB",USA:"US",URY:"UY",UZB:"UZ",VUT:"VU",VEN:"VE",VNM:"VN",
    YEM:"YE",ZMB:"ZM",ZWE:"ZW",
    UTO:"AU",D:"DE",
    HKG:"HK", MAC:"MO", PSE:"PS",
};

function toIso2(code) {
    if (!code) return null;
    code = code.trim().toUpperCase();
    if (code.length === 2) return code;
    if (ISO3_TO_ISO2[code]) return ISO3_TO_ISO2[code];
    if (typeof iso3166 !== "undefined" && iso3166.codes?.[code]) {
        return iso3166.codes[code];
    }
    return null;
}

function checkDigit(field, digit) {
    const ponder = [7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,
                    7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1];
    const valorLetra = {
        A:10,B:11,C:12,D:13,E:14,F:15,G:16,H:17,I:18,J:19,K:20,
        L:21,M:22,N:23,O:24,P:25,Q:26,R:27,S:28,T:29,U:30,V:31,
        W:32,X:33,Y:34,Z:35,'<':0,';':0
    };
    try {
        let suma = 0;
        field = field.toUpperCase();
        for (let i = 0; i < field.length; i++) {
            const c = field[i];
            if (!isNaN(c)) {
                suma += Number(c) * ponder[i];
            } else if (c in valorLetra) {
                suma += valorLetra[c] * ponder[i];
            } else {
                return false;
            }
        }
        return (suma % 10) === Number(digit);
    } catch (e) {
        return false;
    }
}

class MrzScannerWidget extends Component {
    static template = "travel_tax_free.MrzScannerWidget";
    static props = ["record", "readonly", "*"];

    setup() {
        this.orm = useService("orm");
    }

    async scan() {
        const opcion = prompt("Introduzca pasaporte/QR:");
        if (!opcion) return;

        try {
            let name, iso2, passport, dateStr;
            const rawData = opcion.trim();

            if (rawData.endsWith("#")) {
                const campos = atob(rawData.slice(0, -1)).split("*");
                name     = campos[0];
                passport = campos[1];
                iso2     = toIso2(campos[2]);
                dateStr  = campos[3].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

            } else if (rawData.startsWith("P") && rawData.length >= 88) {
                const control1 = rawData.substring(44, 53);
                const cdigit1  = rawData.charAt(53);
                const control2 = rawData.substring(57, 63);
                const cdigit2  = rawData.charAt(63);

                if (!checkDigit(control1, cdigit1) || !checkDigit(control2, cdigit2)) {
                    alert("Pasaporte/QR introducido erróneo (dígito de control inválido)");
                    return;
                }

                name = rawData.substring(5, 44)
                    .replace(/[<;]/g, " ")
                    .replace(/0/g, "O")
                    .replace(/1/g, "I")
                    .replace(/\s{2,}/g, " ")
                    .trim();

                iso2     = toIso2(rawData.substring(2, 5));
                passport = rawData.substring(44, 53).replace(/[<;]/g, "");

                const yy   = parseInt(rawData.substring(57, 59));
                const year = (yy > 30 ? 1900 : 2000) + yy;
                dateStr    = `${year}-${rawData.substring(59, 61)}-${rawData.substring(61, 63)}`;

            } else {
                alert("Pasaporte/QR introducido erróneo");
                return;
            }

            if (!name) { alert("No se pudo leer el nombre"); return; }
            if (!iso2)  { alert("Código de país no reconocido"); return; }

            const birthDate = DateTime.fromISO(dateStr);
            if (!birthDate.isValid) { alert("Fecha no válida: " + dateStr); return; }

            const countries = await this.orm.searchRead(
                "res.country",
                [["code", "=", iso2]],
                ["id", "display_name"]
            );
            const country = countries.length > 0 ? countries[0] : null;
            const updates = {
                name:           name,
                passport:       passport,
                date_birthdate: birthDate,
            };

            if (country) {
                const countryObj = { id: country.id, display_name: country.display_name };

                if (EU_COUNTRIES.includes(iso2)) {
                    updates.passport_country_id = countryObj;
                    updates.country_id           = false;
                    updates.same_country         = false;
                    setTimeout(() => alert(
                        "País no permitido para realizar Tax Free.\n" +
                        "Introduzca el país de residencia manualmente."
                    ), 200);
                } else {
                    updates.passport_country_id = countryObj;
                    updates.country_id           = countryObj;
                    updates.same_country         = true;
                }
            } else {
                console.warn("País no encontrado en Odoo para ISO2:", iso2);
            }

            await this.props.record.update(updates);

        } catch (err) {
            console.error("MRZ scan error:", err);
            alert("Error procesando el código: " + err.message);
        }
    }
}

registry.category("view_widgets").add("mrz_scanner", {
    component: MrzScannerWidget,
});