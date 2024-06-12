odoo.define("pos_taxfree.partner_list", function(require){
    'use strict;'

    const { _t } = require("web.core");
    const rpc = require('web.rpc');
    const Registries = require('point_of_sale.Registries');
    const PartnerListScreen = require('point_of_sale.PartnerListScreen');
    const PartnerDetailsEdit = require('point_of_sale.PartnerDetailsEdit');

    const { onMounted, useState, onWillUnmount } = owl;

    var CustomDetails = (PartnerDetailsEdit) =>
        class CustomDetails extends PartnerDetailsEdit {
            setup() {
                super.setup();

                this.intFields.push("passport_country_id");
                var new_changes = useState({
                    country_id: this.props.partner.country_id && this.props.partner.country_id[0],
                    passport: this.props.partner.passport || "",
                    passport_country_id: this.props.partner.passport_country_id && this.props.partner.passport_country_id[0],
                    date_birthdate: this.props.partner.date_birthdate || "",
                });

                this.changes = Object.assign({}, this.changes, new_changes);

                onMounted(() => {
                    this.env.bus.on("save-partner", this, this.saveChanges);
                });

                onWillUnmount(() => {
                    this.env.bus.off("save-partner", this);
                });
            }

            saveChanges() {
                // super.saveChanges();

                const preProcessedChanges = {};
                for (const [key, value] of Object.entries(this.changes)) {
                    if (this.intFields.includes(key)) {
                        preProcessedChanges[key] = parseInt(value) || false;
                    } else {
                        preProcessedChanges[key] = value;
                    }
                }

                if (
                    (this.env.pos.config.partner_email_required && !preProcessedChanges.email) ||
                    (preProcessedChanges.email && !this.validateEmail(preProcessedChanges.email))
                ) {
                    //pass
                } else {
                    this.props.partner.country_id = $("#country_param").val();
                    this.props.partner.passport_country_id = $("#pass_param").val();
                    this.props.partner.name = $('.detail.partner-name').val();
                    this.props.partner.passport = $('.detail.partner-passport').val();
                    this.props.partner.date_birthdate = $('.detail.partner-birthdate').val();
                    this.changes['country_id'] = this.props.partner.country_id;
                    this.changes['passport_country_id'] = this.props.partner.passport_country_id;
                    this.changes['name'] = this.props.partner.name;
                    this.changes['passport'] = this.props.partner.passport;
                    this.changes['date_birthdate'] = this.props.partner.date_birthdate;
                }

                const processedChanges = {};
                for (const [key, value] of Object.entries(this.changes)) {
                    if (this.intFields.includes(key)) {
                        processedChanges[key] = parseInt(value) || false;
                    } else {
                        processedChanges[key] = value;
                    }
                }

                if (
                    processedChanges.state_id &&
                    this.env.pos.states.find((state) => state.id === processedChanges.state_id)
                        .country_id[0] !== processedChanges.country_id
                ) {
                    processedChanges.state_id = false;
                }

                if (
                    (!this.props.partner.name && !processedChanges.name) ||
                    processedChanges.name === ""
                ) {
                    return this.showPopup("ErrorPopup", {
                        title: _t("El nombre de cliente es obligatorio"),
                    });
                }

                if (this.env.pos.config.partner_email_required && !processedChanges.email) {
                    return this.showPopup("ErrorPopup", {
                        title: _t("El email es obligatorio"),
                    });
                }

                if (processedChanges.email && !this.validateEmail(processedChanges.email)) {
                    return this.showPopup("ErrorPopup", {
                        title: _t("Introduzca un email válido por favor"),
                    });
                }

                processedChanges.id = this.props.partner.id || false;
                this.trigger("save-changes", { processedChanges });
                // return this._super.apply(this, partner);
            }

            validateEmail(email) {
                return String(email)
                    .toLowerCase()
                    .match(
                        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                    );
            }
        }

    Registries.Component.extend(PartnerDetailsEdit, CustomDetails);

    const PartnerList = (PartnerListScreen) =>
        class PartnerList extends PartnerListScreen {
            setup() {
                super.setup();
            }

            scan_client_details(partner) {
                var self = this;

                function check_digit(e,cdigit) {

                    var ponder = [7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1];
                    var valorletra = {'A':10,'B':11,'C':12,'D':13,'E':14,'F':15,'G':16,'H':17,'I':18,'J':19,'K':20,'L':21,'M':22,'N':23,'O':24,'P':25, 'Q':26,'R':27,'S':28,'T':29,'U':30,'V':31,'W':32,'X':33,'Y':34,'Z':35,'<':0,';':0};

                    try {
                        var suma1 = 0;
                        var i = 0;

                        e = e.toUpperCase()

                        var x;
                        for (x in e) {
                            var s = e.charAt(x);
                            if (!isNaN(s)) {
                                suma1 = suma1+(Number(s)*ponder[i]);
                            } else if (s in valorletra) {
                                suma1 = suma1+(valorletra[s]*ponder[i]);
                            } else {
                                return false;
                            }
                            i=i+1;
                        }

                        if ((suma1)%10 != Number(cdigit)) {
                            return false;
                        } else {
                            return true;
                        }

                    } catch(err) {
                        console.log("ERROR "+err);
                        return false;
                    }
                }

                var opcion = "";

                while (opcion !=null) {
                    opcion = prompt("Introduzca pasaporte/QR:");

                    if (opcion == null) {
                        continue;
                    }

                    if (opcion == "") {
                        alert("Introduzca un pasaporte/QR");
                        continue;
                    }

                    opcion = opcion.trim();

                    if (opcion.substring(opcion.length-1, opcion.length)=="#") {
                        try {
                            var campos = atob(opcion.substring(0,opcion.length-1)).split("*");
                            var name = campos[0];
                            var country = campos[2];
                            var passport = campos[1];

                            var date = $.datepicker.parseDate('yymmdd', campos[3]);

                            self.set_client_details(name,passport,date,country);
                            opcion = null;
                        } catch(err) {
                            alert("Pasaporte/QR introducido erroneo");
                            return;
                        }


                    } else if (opcion.substring(0,1) == "P" && opcion.length>=88) {
                        var cdigit1 = opcion.charAt(53);
                        var cdigit2 = opcion.charAt(63);
                        var control1 = opcion.substring(44,53);
                        var control2 = opcion.substring(57,63);

                        if (!check_digit(control1,cdigit1) || !check_digit(control2,cdigit2)) {
                            alert("Pasaporte/QR introducido erroneo");
                            return;
                        }

                        var date;
                        try {
                            date = $.datepicker.parseDate('ymmdd', opcion.substring(57,63));
                        } catch(err) {
                            alert("Pasaporte/QR introducido erroneo");
                            return;
                        }

                        var name = opcion.substring(5,44).replaceAll("<"," ").replaceAll(";"," ").replaceAll('0',"O").replaceAll("1","I").replaceAll(/\s\s+/g, ' ').trim();
                        var country = opcion.substring(2,5);
                        var passport = opcion.substring(44,53).replaceAll('<','').replaceAll(';','');

                        self.set_client_details(name,passport,date,country);
                        opcion = null;

                    } else {
                        alert("Pasaporte/QR introducido erroneo");
                    }
                }

            }

            set_client_details(name,passport,datebirth,country) {
                var self = this;
                const eu_countries = ['BE','BG','CZ','DK','DE','EE','IE','EL','ES','FR','HR','IT','CY','LV','LT','LU','HU','MT','NL','AT','PL','PT','RO','SI','SK','FI','SE'];

                var iso2;
                if (country.length==2) {
                    iso2 = country;
                } else if (iso3166.codes.hasOwnProperty(country)) {
                    iso2 = iso3166.codes[country];
                } else {
                    alert("Pasaporte/QR introducido erroneo");
                    return;
                }

                datebirth.setHours(12);
                var d = datebirth.toISOString().split('T')[0];

                $('.detail.partner-name').val(name);
                $('.detail.partner-passport').val(passport);
                $('.detail.partner-birthdate').val(d);

                if (iso2!=undefined) {
                    var res = rpc.query({
                        model: 'res.country',
                        method: 'search_read',
                        domain: [['code', '=', iso2]],
                        fields: ['id','name']
                    }).then(function (country_id) {
                        if (country_id.length > 0 && country_id[0]["id"]) {
                            if (self.env.pos.config.experimental_country) {
                                var $select_ac = $('select[name="country_id"]').selectize();
                                var $select_pc = $('select[name="passport_country_id"]').selectize();
                                if (eu_countries.includes(iso2)) {
                                    $('.detail.partner-checkbox').prop("checked", false);
                                    $select_ac[0].selectize.setValue("");
                                    $('#passport_country').show();
                                    $select_pc[0].selectize.setValue(country_id[0]["id"]);
                                    setTimeout(function(){alert("País no permitido para realizar tax free. Introduzca el país de residencia manualmente");},200);
                                } else {
                                    $select_ac[0].selectize.setValue(country_id[0]["id"]);
                                    $select_pc[0].selectize.setValue(country_id[0]["id"]);
                                }
                            } else {
                                if (eu_countries.includes(iso2)) {
                                    $('.detail.partner-checkbox').prop("checked", false);
                                    $('.detail.partner-address-country').val("").change();
                                    $('#passport_country').show();
                                    $('.detail.partner-passport-country').val(country_id[0]["id"]).change();
                                    setTimeout(function(){alert("País no permitido para realizar tax free. Introduzca el país de residencia manualmente");},200);
                                } else {
                                    $('.detail.partner-address-country').val(country_id[0]["id"]).change();
                                    $('.detail.partner-passport-country').val(country_id[0]["id"]).change();
                                }
                            }


                        }
                    });

                }
            }
        }

    Registries.Component.extend(PartnerListScreen, PartnerList);
    return PartnerList;
});
