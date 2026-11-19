/** @odoo-module **/

import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(ReceiptScreen.prototype, {
    // En Odoo 17 currentOrder lo fija el setup() de ReceiptScreen
    // (this.pos.get_order()); no hace falta sobrescribirlo.

    async click_print_taxfree() {
        const order = this.currentOrder;
        if (!order) return;

        if (order.error_taxfree) {
            this.env.services.popup.add(ErrorPopup, {
                title: _t("Error Tax Free"),
                body: order.error_taxfree,
            });
        } else if (!order.get_taxfree_pdf()) {
            this.env.services.popup.add(ErrorPopup, {
                title: _t("Error Tax Free"),
                body: _t(
                    "La factura se ha creado correctamente, pero ha habido un error " +
                    "inesperado creando el Tax Free. Por favor, comuníquese con su " +
                    "central para la creación manual del Tax Free."
                ),
            });
        } else {
            try {
                const byteCharacters = atob(order.get_taxfree_pdf());
                const byteArray = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteArray[i] = byteCharacters.charCodeAt(i);
                }
                const blob = new Blob([byteArray], { type: "application/pdf" });
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.target = "_blank";
                link.download = (order.get_taxfree_number() || order.name) + ".pdf";
                link.click();
                setTimeout(() => window.URL.revokeObjectURL(link.href), 100);
            } catch (err) {
                console.error("Error al procesar el PDF del Tax Free:", err);
                this.env.services.popup.add(ErrorPopup, {
                    title: _t("Error de descarga"),
                    body: _t("No se pudo generar el archivo PDF para la descarga."),
                });
            }
        }
    }
});
