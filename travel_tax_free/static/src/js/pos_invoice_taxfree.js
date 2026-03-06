/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;

        const isTaxFree = order?.is_to_taxfree() || false;
        const partner   = order?.partner_id;

        // Validación antes de confirmar pedido
        if (isTaxFree) {
            if (!partner) {
                this.pos.dialog.add(AlertDialog, {
                    title: _t("Error Tax Free"),
                    body: _t("Seleccione un cliente antes de continuar."),
                });
                return;
            }
            const orm = this.env.services.orm;
            const res = await orm.call(
                "res.partner", "test_tourist_id", [partner.id]
            );
            if (res && res.code !== "0000") {
                this.pos.dialog.add(AlertDialog, {
                    title: _t("Error Tax Free"),
                    body: res.msg,
                });
                return;
            }
        }

        // Guardar pedido + factura y navegar al recibo
        await super.validateOrder(...arguments);

        // Generar Tax Free
        if (isTaxFree) {
            const orm = this.env.services.orm;
            let res = null;

            try {
                const orderId = (order.id && typeof order.id === "number" && order.id > 0)
                    ? order.id
                    : null;

                res = orderId
                    ? await orm.call("pos.order", "generate_taxfree_from_order_id", [orderId])
                    : await orm.call("pos.order", "generate_taxfree_from_order_name", [order.name]);

            } catch (e) {
                res = { code: "EXCEPTION", msg: e.message || "Error de comunicación con el servidor Tax Free." };
            }

            if (res && res.code === "0000") {
                order.set_taxfree_pdf(res.check);
                order.set_taxfree_number(res.number);
            } else {
                const errorMsg = (res && res.msg)
                    ? String(res.msg).replace(/^'+|'+$/g, "").trim()
                    : "Error desconocido.";

                order.error_taxfree = errorMsg;

                // Mostrar el error directamente al pasar a la siguiente pantalla
                this.pos.dialog.add(AlertDialog, {
                    title: _t("Error Tax Free"),
                    body: _t("Ha ocurrido un problema al crear el taxfree, por favor contacte con Travel Tax Free. Error: ") + errorMsg,
                });
            }
        }
    },

    click_taxfree() {
        const order = this.currentOrder;
        const newState = !order.is_to_taxfree();
        order.set_to_taxfree(newState);
        if (newState && !order.isToInvoice()) {
            order.setToInvoice(true);
        }
    },

    toggleIsToInvoice() {
        const order = this.currentOrder;
        if (order.isToInvoice() && order.is_to_taxfree()) {
            order.set_to_taxfree(false);
        }
        super.toggleIsToInvoice(...arguments);
    },
});