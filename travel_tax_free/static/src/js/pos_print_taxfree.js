/** @odoo-module **/

import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

patch(ReceiptScreen.prototype, {
    // ELIMINADO: get currentOrder() NO debe sobreescribirse.
    // El getter nativo de Odoo 19 ya funciona correctamente:
    // this.pos.models["pos.order"].getBy("uuid", this.props.orderUuid)

    async click_print_taxfree() {
        const order = this.currentOrder;
        if (!order) return;

        if (order.error_taxfree) {
            this.pos.dialog.add(AlertDialog, {
                title: _t("Error Tax Free"),
                body: order.error_taxfree,
            });
        } else if (!order.get_taxfree_pdf()) {
            this.pos.dialog.add(AlertDialog, {
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
                this.pos.dialog.add(AlertDialog, {
                    title: _t("Error de descarga"),
                    body: _t("No se pudo generar el archivo PDF para la descarga."),
                });
            }
        }
    }
});