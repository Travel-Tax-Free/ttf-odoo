/** @odoo-module **/

// Datos del turista en la ficha de cliente del TPV. En Odoo 17 el TPV no usa
// el formulario del backend para editar clientes, sino PartnerDetailsEdit, así
// que los campos y el lector de pasaporte se añaden aquí.

import { PartnerDetailsEdit } from "@point_of_sale/app/screens/partner_list/partner_editor/partner_editor";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { parseMrz, isEuCountry, EU_COUNTRY_ALERT } from "@travel_tax_free/js/mrz_scanner_widget";

const EMAIL_RE = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

patch(PartnerDetailsEdit.prototype, {
    setup() {
        super.setup(...arguments);
        const partner = this.props.partner;
        this.intFields.push("passport_country_id");
        Object.assign(this.changes, {
            passport: partner.passport || "",
            date_birthdate: partner.date_birthdate || "",
            // Un cliente nuevo nace con el mismo país de pasaporte, como en el backend.
            same_country: partner.id ? Boolean(partner.same_country) : true,
            passport_country_id: partner.passport_country_id && partner.passport_country_id[0],
        });
    },

    showTaxfreeError(title) {
        return this.env.services.popup.add(ErrorPopup, { title });
    },

    saveChanges() {
        const email = this.changes.email;
        if (this.pos.config.partner_email_required && !email) {
            return this.showTaxfreeError(_t("El email es obligatorio"));
        }
        if (email && !EMAIL_RE.test(String(email).toLowerCase())) {
            return this.showTaxfreeError(_t("Introduzca un email válido por favor"));
        }
        if (this.changes.same_country) {
            this.changes.passport_country_id = false;
        } else if (!parseInt(this.changes.passport_country_id)) {
            return this.showTaxfreeError(_t("Indique el país de pasaporte"));
        }
        return super.saveChanges(...arguments);
    },

    scanPassport() {
        const opcion = prompt("Introduzca pasaporte/QR:");
        if (!opcion) return;

        const leido = parseMrz(opcion);
        if (leido.error) {
            this.showTaxfreeError(leido.error);
            return;
        }

        this.changes.name = leido.name;
        this.changes.passport = leido.passport;
        this.changes.date_birthdate = leido.birthDate.toISODate();

        const country = this.pos.countries.find((c) => c.code === leido.iso2);
        if (!country) {
            console.warn("País no encontrado en Odoo para ISO2:", leido.iso2);
            return;
        }
        this.changes.passport_country_id = country.id;
        if (isEuCountry(leido.iso2)) {
            this.changes.country_id = "";
            this.changes.same_country = false;
            this.showTaxfreeError(EU_COUNTRY_ALERT);
        } else {
            this.changes.country_id = country.id;
            this.changes.same_country = true;
        }
    },
});
