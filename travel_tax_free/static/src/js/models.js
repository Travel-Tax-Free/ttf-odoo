odoo.define('pos_taxfree.models_extend', function(require){

    var module = require('point_of_sale.models');
    var models = module.PosModel.prototype.models;
    var core = require('web.core');
    var rpc = require('web.rpc')

    for(var i=0; i<models.length; i++){
        if(models[i].model === 'res.partner'){
             models[i].fields.push('passport','date_birthdate','id');
             break;
        }
    }

    old_prototype = module.Order.prototype
    module.Order = module.Order.extend({
        initialize: function(attributes,options){
            var self = this;
            old_prototype.initialize.call(this,attributes,options);
            this.to_taxfree = false;
        },
        set_to_taxfree: function(to_taxfree) {
            this.to_taxfree = to_taxfree;
        },
        is_to_taxfree: function(){
            return this.to_taxfree;
        },
    });

    old_prototype_posmodel = module.PosModel.prototype;
    module.PosModel = module.PosModel.extend({
       test_tourist: function() {
            var client = this.get_client();
            var peticion = $.Deferred();
            var res = rpc.query({
                        model: 'res.partner',
                        method: 'test_tourist_id',
                        args: [{}, client.id],
                    }, {
                timeout: 3000,
                shadow: true,
            }).then(function (data) {
                peticion.resolve(data);
            }).catch(function () {
                peticion.reject({
                    code: '9999',
                    msg: 'Error verificando turista',
                });
            });

            return peticion;

       },

        push_and_invoice_order: function (order) {
            console.log('mirando cositas');
            var self = this;
            if (!order.is_to_taxfree()) {
                return old_prototype_posmodel.push_and_invoice_order.call(self,order);
            }

            var verificaciones = $.Deferred();

            if(!order.get_client()) {
                return verificaciones.reject({code:400, message:'Missing Customer', data:{}});
            }

            $.when(this.test_tourist()).then(function(resultado) {
                if ("code" in resultado && resultado.code == '0000') {
                    console.log("vamos bien");
                    console.log(order);
                    var promise = old_prototype_posmodel.push_and_invoice_order.call(self,order);
                    promise.then(function() {
                        console.log('todo bem');
                        verificaciones.resolve();
                    }).catch(function(error) {
                        console.log('todo mal');
                        console.log(error);
                        verificaciones.reject(error);

                    });
                    //return verificaciones.reject({'code': 9999, 'msg': "test"});
                } else {
                    resultado.error_taxfree = true;
                    console.log("vamos mal");
                    return verificaciones.reject(resultado);
                }

            }).catch(function(resultado) {
                    resultado.error_taxfree = true;
                    return verificaciones.reject(resultado);
            });

            return verificaciones.promise();
        }
    });

});

