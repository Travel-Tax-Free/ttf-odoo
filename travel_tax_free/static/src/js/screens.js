odoo.define('pos_taxfree.screens_extend', function(require){

    var core = require('web.core');
    var rpc = require('web.rpc')
    var _t = core._t;

    var screens = require('point_of_sale.screens');

    screens.PaymentScreenWidget.include({
        renderElement: function() {
            var self = this;
            this._super();
            this.$('.js_taxfree').click(function(){
                self.click_taxfree();
            });

        },

        click_taxfree: function(){
            var order = this.pos.get_order();
            this.button_taxfree(!order.is_to_taxfree());
            if (!order.is_to_invoice()) {
                this.click_invoice();
            }
       },

       button_taxfree: function(state) {
            var order = this.pos.get_order();
            order.set_to_taxfree(state);
            this.$('.js_taxfree').toggleClass('highlight', state);
       },

       click_invoice: function() {
            this._super();
            var order = this.pos.get_order();
            if (!order.is_to_invoice() && order.is_to_taxfree()) {
                this.button_taxfree(false);
            }
       },
/*
       test_tourist: function() {
            var order = this.pos.get_order();
            var client = order.get_client();
            var res = rpc.query({
                        model: 'res.partner',
                        method: 'test_tourist_id',
                        args: [{}, client.id],
                    }, {
                timeout: 3000,
                shadow: true,
            }).then(function (data) {
                        console.log('----');
                        console.log(data);
                        invoiced.resolve();
                    });

            return res;

       },


       order_is_valid: function() {
            result = this._super();
            if (!result) {
                return false;
            }

            var self = this;
            var order = this.pos.get_order();
            var client = order.get_client();

            if (!order.is_to_taxfree()) {
                return true;
            } else {

                if (!client || !client.passport || client.passport.lenght<3 || !client.date_birthdate || !client.country_id) {
                    this.gui.show_popup('confirm', {
                        'title': !client ? _t('Please select the customer') : _t('Please select a valid customer'),
                        'body': !client ? _t('You need to select the customer before you make a tax free') :  _t('This customer does not have a valid passport, country or birthdate'),
                        confirm: function () {
                            this.gui.show_screen('clientlist');
                        },
                    });
                    return false;
                } else {

                        this.test_tourist().then(num => {
                            console.log('*****');
                            console.log(num);
                        });
                        console.log('######');
                        //console.log(test);


                        return false;



                }
            }
       },
*/
    });

    screens.ReceiptScreenWidget.include({
        show: function(){
            this._super();
            var self = this;
            var order = this.pos.get_order();

            this.set_order_name(order.is_to_taxfree() ? order.name : null);
            this.show_print_taxfree(order.is_to_taxfree());

        },

        show_print_taxfree: function(visible) {
            if (visible) {
                this.$('.print_taxfree').show();
            } else {
                this.$('.print_taxfree').hide();
            }
        },

        renderElement: function() {
            var self = this;
            this._super();

            this.$('.print_taxfree').click(function(){
                self.click_print_taxfree();
            });
        },

        set_order_name: function(order_name) {
            this.order_name = order_name;
        },
        get_order_name: function(){
            return this.order_name;
        },

        click_print_taxfree: function() {
                console.log(this.get_order_name());
        },

    });

    screens.ScreenWidget.include({
        _handleFailedPushForInvoice: function (order, refresh_screen, error) {
            var self = this;
            order = order || this.pos.get_order();
            this.invoicing = false;
            order.finalized = false;

            if (error && "error_taxfree" in error) {
                this.gui.show_popup('confirm',{
                    'title': _t('Please select a valid customer'),
                    'body': _t('This customer does not have a valid passport, country or birthdate'),
                    confirm: function(){
                        self.gui.show_screen('clientlist', null, refresh_screen);
                    },
                });
            } else {
                return this._super(order, refresh_screen, error);
            }
        }

    });

});

