odoo.define('pos_taxfree.models2', function(require) {
    'use strict;'

    var { PosGlobalState, Order } = require('point_of_sale.models');
    const rpc = require('web.rpc');
    const Registries = require('point_of_sale.Registries');

    var old_prototype_posmodel = PosGlobalState.prototype;
    const PosExtension = (PosGlobalState) =>
        class PosExtension extends PosGlobalState {
            setup() {
                super.setup();
            }

            constructor(obj){
                super(obj);
            }

            get_client() {
                var order = this.get_order();
                if (order) {
                    return order.get_partner();
                }
                return null;
            }

            test_tourist() {
                var client = this.get_client();
                return new Promise(function (resolve, reject) {
                    rpc.query({
                            model: 'res.partner',
                            method: 'test_tourist_id',
                            args: [{}, client.id],
                        }, {
                        timeout: 3000,
                        shadow: true,
                    }).then(function (data) {
                        if ("code" in data && data["code"] == '0000') {
                            resolve(data);
                        } else{
                            reject(data);
                        }
                    }).catch(function () {
                        reject({
                            code: '9999',
                            message: 'error_tourist',
                        });
                    })
                });
            }

            create_taxfree(name) {
                var peticion = $.Deferred();
                var res = rpc.query({
                            model: 'pos.order',
                            method: 'generate_taxfree_from_order_name',
                            args: [{}, name],
                }, {
                    shadow: false,
                }).then(function (data) {
                    peticion.resolve(data);
                }).catch(function () {
                    peticion.reject({
                        code: '9899',
                        msg: 'Error creando el tax free',
                    });
                });

                return peticion;

            }

            get_invoice_number(order) {
                var peticion = $.Deferred();
                var res = rpc.query({
                        model: 'pos.order',
                        method: 'search_read',
                        domain: [['pos_reference', '=', order['name']]],
                        fields: ['account_move']
                }).then(function (orders) {
                    if (orders.length > 0 && orders[0]['account_move'] && orders[0]['account_move'][1]) {
                        var invoice_number = orders[0]['account_move'][1].split(" ")[0];
                        order['invoice_number'] = invoice_number;
                    }
                    peticion.resolve();
                }).catch(function (type, error) {
                    peticion.reject(error);
                });

                return peticion;
            }

            push_single_order(order, opts) {
                // push_and_invoice_order
                opts = opts || {};
                var self = this;
                var push_order_promise = old_prototype_posmodel.push_single_order.call(self, order);

                if (!order.is_to_taxfree()) {
                    return push_order_promise;
                }

                var verificaciones = $.Deferred();

                if(!order.get_partner()) {
                    return verificaciones.reject({code:400, message:'Missing Customer', data:{}});
                }

                if (order.get_total_tax()==0) {
                    return verificaciones.reject({code:'9584', message:'La factura no tiene IVA', error_taxfree:true});
                }


                $.when(this.test_tourist()).then(function(resultado) {
                    if ("code" in resultado && resultado.code == '0000') {
                        var order_number = order.name;
                        push_order_promise.then(function() {
                            self.create_taxfree(order_number).then(function(resultado) {
                                if ("code" in resultado && resultado.code == '0000') {
                                    order.set_taxfree_pdf(resultado.check);
                                    order.set_taxfree_number(resultado.number);
                                    verificaciones.resolve();
                                } else {
                                    order.error_taxfree = 'Ha habido un error inesperado creando tax free. Por favor, comuniquese con su central para la creación manual.';
                                    if ("code" in resultado) {
                                        order.error_taxfree += ' Detalles: '+resultado['code'];
                                        if ("msg" in resultado) {
                                            order.error_taxfree += '. '+resultado['msg'];
                                        }
                                    }
                                    verificaciones.resolve();
                                }
                            }).catch(function(error) {
                                error.error_taxfree = 'Error desconocido';
                                verificaciones.reject(error);
                            });

                        }).catch(function(error) {
                            error.error_taxfree = 'Error desconocido';
                            verificaciones.reject(error);
                        });
                    } else {
                        verificaciones.reject(resultado);
                    }

                }).catch(function(resultado) {
                    verificaciones.reject(resultado);
                });

                return push_order_promise;
            }
        }

    Registries.Model.extend(PosGlobalState, PosExtension);

    var old_prototype = Order.prototype
    const PosOrderExtension = (Order) =>
        class PosOrderExtension extends Order {
            setup() {
                super.setup();

                this.to_taxfree = false;
                this.taxfree_pdf = false;
                this.taxfree_number = false;
                this.invoice_number = false;
                this.error_taxfree = false;
            }

            initialize(attributes, options) {
                old_prototype.initialize.call(this,attributes,options);
                return old_prototype.initialize.call(this,attributes,options);
            }

            set_to_taxfree(to_taxfree) {
                this.to_taxfree = to_taxfree;
            }

            is_to_taxfree() {
                return this.to_taxfree;
            }

            set_taxfree_pdf(taxfree_pdf) {
                this.taxfree_pdf = taxfree_pdf;
            }
            get_taxfree_pdf() {
                return this.taxfree_pdf;
            }
            set_taxfree_number(taxfree_number) {
                this.taxfree_number = taxfree_number;
            }
            get_taxfree_number() {
                return this.taxfree_number;
            }

            export_for_printing() {
                var self = this;
                var receipt = old_prototype.export_for_printing.call(this);

                if (self.is_to_invoice()) {
                    receipt.invoice_id = {name: self.invoice_number};
                }

                return receipt;
            }
        }

    Registries.Model.extend(Order, PosOrderExtension);
});
