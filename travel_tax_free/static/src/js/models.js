/** @odoo-module **/

import { Order } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";

patch(Order.prototype, {
    setup() {
        super.setup(...arguments);
        this.to_taxfree     = this.to_taxfree     || false;
        this.taxfree_pdf    = this.taxfree_pdf    || false;
        this.taxfree_number = this.taxfree_number || false;
        this.error_taxfree  = this.error_taxfree  || false;
    },

    set_partner(partner) {
        super.set_partner(...arguments);
        if (this.fiscal_position) {
            this.set_fiscal_position(false);
        }
    },

    set_to_taxfree(val)     { this.to_taxfree = val; },
    is_to_taxfree()         { return this.to_taxfree; },
    set_taxfree_pdf(val)    { this.taxfree_pdf = val; },
    get_taxfree_pdf()       { return this.taxfree_pdf; },
    set_taxfree_number(val) { this.taxfree_number = val; },
    get_taxfree_number()    { return this.taxfree_number; },

    export_as_JSON() {
        const json = super.export_as_JSON(...arguments);
        json.to_taxfree = this.to_taxfree;
        return json;
    },
    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        this.to_taxfree = json.to_taxfree || false;
    },
});
