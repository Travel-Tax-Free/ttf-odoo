/** @odoo-module **/

import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";

patch(PosOrder.prototype, {
    setup() {
        super.setup(...arguments);
        this.to_taxfree     = this.to_taxfree     || false;
        this.taxfree_pdf    = this.taxfree_pdf    || false;
        this.taxfree_number = this.taxfree_number || false;
        this.error_taxfree  = this.error_taxfree  || false;
    },

    // Evitar que al asignar cliente se aplique posición fiscal y elimine el IVA
    setPartner(partner) {
        super.setPartner(...arguments);
        if (this.fiscal_position_id) {
            this.fiscal_position_id = false;
            for (const line of this.lines || []) {
                if (typeof line.setQuantity === "function") {
                    line.setQuantity(line.qty);
                }
            }
        }
    },

    set_to_taxfree(val)     { this.to_taxfree = val; },
    is_to_taxfree()         { return this.to_taxfree; },
    set_taxfree_pdf(val)    { this.taxfree_pdf = val; },
    get_taxfree_pdf()       { return this.taxfree_pdf; },
    set_taxfree_number(val) { this.taxfree_number = val; },
    get_taxfree_number()    { return this.taxfree_number; },

    serialize() {
        const json = super.serialize(...arguments);
        json.to_taxfree = this.to_taxfree;
        return json;
    },
    init_from_JSON(json) {
        super.init_from_JSON?.(...arguments);
        this.to_taxfree = json.to_taxfree || false;
    }
});