/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;

        const isTaxFree = order?.is_to_taxfree() || false;
        const partner   = order?.get_partner();

        // Validación antes de confirmar pedido
        if (isTaxFree) {
            if (!partner) {
                this.env.services.popup.add(ErrorPopup, {
                    title: _t("Error Tax Free"),
                    body: _t("Seleccione un cliente antes de continuar."),
                });
                return;
            }
            const res = await this.env.services.orm.call(
                "res.partner", "test_tourist_id", [partner.id]
            );
            if (res && res.code !== "0000") {
                this.env.services.popup.add(ErrorPopup, {
                    title: _t("Error Tax Free"),
                    body: res.msg,
                });
                return;
            }
        }

        // Guardar pedido + factura y navegar al recibo
        await super.validateOrder(...arguments);

        // Generar Tax Free. Solo si el pedido se ha llegado a validar: si
        // super.validateOrder ha cortado (pago incompleto, etc.), no hay
        // pedido en el servidor al que asociarlo.
        if (isTaxFree && order.finalized) {
            const orm = this.env.services.orm;
            let res = null;

            try {
                // Odoo 17 guarda el id de servidor de cada pedido validado
                // indexado por su nombre (pos_reference).
                const orderId = this.pos.validated_orders_name_server_id_map[order.name] || null;

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
                this.env.services.popup.add(ErrorPopup, {
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
        if (newState && !order.is_to_invoice()) {
            order.set_to_invoice(true);
        }
    },

    toggleIsToInvoice() {
        const order = this.currentOrder;
        if (order.is_to_invoice() && order.is_to_taxfree()) {
            order.set_to_taxfree(false);
        }
        super.toggleIsToInvoice(...arguments);
    },
});
