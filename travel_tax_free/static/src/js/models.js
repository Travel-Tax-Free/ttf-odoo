odoo.define('pos_taxfree.models_final', function(require) {
    'use strict';

    const { PosGlobalState, Order } = require('point_of_sale.models');
    const rpc = require('web.rpc');
    const Registries = require('point_of_sale.Registries');
    const { Gui } = require('point_of_sale.Gui');

    const PosTaxFreeGlobal = (PosGlobalState) => class PosTaxFreeGlobal extends PosGlobalState {
        
        async push_single_order(order, opts) {
            if (!order || !order.is_to_taxfree()) {
                return super.push_single_order(order, opts);
            }

            try {
                const client = order.get_partner();
                if (!client) {
                    Gui.showPopup('ErrorPopup', { title: 'Error', body: 'Debe seleccionar un cliente' });
                    return false;
                }

                const res_tourist = await rpc.query({
                    model: 'res.partner',
                    method: 'test_tourist_id',
                    args: [client.id],
                });

                if (res_tourist && res_tourist.code !== '0000') {
                    Gui.showPopup('ErrorPopup', {
                        title: 'Validación Tax Free',
                        body: res_tourist.msg || 'Datos de cliente no válidos',
                    });
                    return false;
                }
            } catch (err) {
                console.error("Error validando turista", err);
                return false;
            }

            const server_ids = await super.push_single_order(order, opts);

            if (server_ids && server_ids.length > 0) {
                try {
                    const res = await rpc.query({
                        model: 'pos.order',
                        method: 'generate_taxfree_from_order_name',
                        args: [order.name],
                    });

                    if (res && res.code === '0000') {
                        order.set_taxfree_pdf(res.check);
                        order.set_taxfree_number(res.number);
                    } else {
                        order.error_taxfree = res.msg || 'Error al generar PDF';
                    }
                } catch (e) {
                    order.error_taxfree = 'Error de comunicación tras crear pedido';
                }
            }

            return server_ids;
        }
    };

    Registries.Model.extend(PosGlobalState, PosTaxFreeGlobal);

    const PosTaxFreeOrder = (Order) => class PosTaxFreeOrder extends Order {
        setup() {
            super.setup();
            this.to_taxfree = this.to_taxfree || false;
            this.taxfree_pdf = this.taxfree_pdf || false;
            this.taxfree_number = this.taxfree_number || false;
            this.error_taxfree = this.error_taxfree || false;
        }
        set_to_taxfree(val) { this.to_taxfree = val; }
        is_to_taxfree() { return this.to_taxfree; }
        set_taxfree_pdf(val) { this.taxfree_pdf = val; }
        get_taxfree_pdf() { return this.taxfree_pdf; }
        set_taxfree_number(val) { this.taxfree_number = val; }
        get_taxfree_number() { return this.taxfree_number; }
    };

    Registries.Model.extend(Order, PosTaxFreeOrder);
});