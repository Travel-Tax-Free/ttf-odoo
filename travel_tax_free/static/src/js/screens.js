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
            if (!this.pos.get_order().get_taxfree_pdf()) {
                    this.gui.show_popup('error',{
                        'title': _t('Error creating tax free'),
                        'body': _t('La factura se ha creado correctamente, pero ha habido un error inesperado creando tax free. Por favor, comuniquese con su central para la creación manual del tax free'),
                    });
            }
            const byteCharacters = atob(this.pos.get_order().get_taxfree_pdf());
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            var blob = new Blob([byteArray], {type: 'application/pdf'});
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.target = "_blank"
            link.download = this.pos.get_order().get_taxfree_number()+".pdf";
            link.click();
        },

    });

    screens.ScreenWidget.include({
        _handleFailedPushForInvoice: function (order, refresh_screen, error) {
            var self = this;
            order = order || this.pos.get_order();
            this.invoicing = false;
            order.finalized = false;

            if (error && "error_taxfree" in error) {
                if ("code" in error && error.code=="9899") {
                    order.set_to_taxfree(false);
                    this.gui.show_popup('error',{
                        'title': _t('Error creating tax free'),
                        'body': _t('La factura se ha creado correctamente, pero ha habido un error inesperado creando tax free. Por favor, comuniquese con su central para la creación manual del tax free'),
                        cancel: function () {
                            this.gui.show_screen('receipt', refresh_screen); // refresh if necessary
                        }
                    });
                } else if ("code" in error && error.code=="9898") {
                    this.gui.show_popup('error',{
                        'title': _t('Error creating tax free'),
                        'body': _t('Para crear el tax free, la factura debe de tener IVA'),
                    });
                } else {
                    this.gui.show_popup('confirm',{
                        'title': _t('Please select a valid customer'),
                        'body': _t('This customer does not have a valid passport, country or birthdate'),
                        confirm: function(){
                            self.gui.show_screen('clientlist', null, refresh_screen);
                        },
                    });
                }
            } else {
                return this._super(order, refresh_screen, error);
            }
        }

    });

    screens.ClientListScreenWidget.include({
        validateEmail: (email) => {
            return String(email)
                .toLowerCase()
                .match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                );
        },

        save_client_details: function(partner) {
            var self = this;

            var fields = {};
            var wipe = []
            this.$('.client-details-contents .detail').each(function(idx,el){
                if (self.integer_client_details.includes(el.name)){
                    var parsed_value = parseInt(el.value, 10);
                    if (isNaN(parsed_value)){
                        fields[el.name] = false;
                    }
                    else{
                        fields[el.name] = parsed_value
                    }
                }
                else{
                    fields[el.name] = el.value || false;
                }
            });

            if (self.pos.config.partner_email_required && !fields.email) {
                this.gui.show_popup('error',_t('A email is required'));
                return;
            }

            if (fields.email && !self.validateEmail(fields.email)) {
                this.gui.show_popup('error',_t('Please enter a valid email'));
                return;
            }

            return this._super(partner);
        }
    });

});

