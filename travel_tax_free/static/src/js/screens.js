odoo.define('pos_taxfree.screens_extend', function(require){

    var core = require('web.core');
    var rpc = require('web.rpc')
    var QWeb = core.qweb;
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

        post_push_order_resolve: function(order, server_ids){
            var self = this;

            return new Promise(function (resolve, reject) {
                var promise = self._super(order, server_ids);

                promise.then(function() {
                    if (!order.is_to_invoice()) {
                        resolve();
                    } else {
                        self.pos.get_invoice_number(order).then(function() {
                            resolve();
                        }).catch(function(error) {
                            reject(error)
                        });
                    }

                }).catch(function(error) {
                    reject(error);
                });
            })




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
            var order = this.pos.get_order();
            if (order.error_taxfree) {
                 this.gui.show_popup('error',{
                    'title': _t('Error creating tax free'),
                    'body': order.error_taxfree,
                 });
            } else if (!order.get_taxfree_pdf()) {
                    this.gui.show_popup('error',{
                        'title': _t('Error creating tax free'),
                        'body': _t('La factura se ha creado correctamente, pero ha habido un error inesperado creando tax free. Por favor, comuniquese con su central para la creación manual del tax free'),
                    });
            } else {
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
            }
        },

/*
        render_receipt: function () {
            //this._super();
            var self = this;
            var _super = this._super.bind(this);
            var order = this.pos.get_order();

            if (!this.pos.config.iface_print_via_proxy && order.is_to_invoice()) {
                var invoiced = new $.Deferred();
                rpc.query({
                    model: 'pos.order',
                    method: 'search_read',
                    domain: [['pos_reference', '=', order['name']]],
                    fields: ['account_move']
                }).then(function (orders) {
                    if (orders.length > 0 && orders[0]['account_move'] && orders[0]['account_move'][1]) {
                        var invoice_number = orders[0]['account_move'][1].split(" ")[0];
                        self.pos.get_order()['invoice_number'] = invoice_number;
                        //self.$('.pos-receipt-container').html(qweb.render('OrderReceipt', self.get_receipt_render_env()));
                        _super();
                    }
                    invoiced.resolve();
                }).catch(function (type, error) {
                    invoiced.reject(error);
                });
                return invoiced;
            } else {
                return self._super();
            }
        }
        */
    });


    screens.ScreenWidget.include({
        _handleFailedPushForInvoice: function (order, refresh_screen, error) {
            var self = this;
            order = order || this.pos.get_order();
            this.invoicing = false;
            order.finalized = false;

            if ("code" in error && error['code'] == '9587') {
                    if ("msg" in error) {
                        msg = error['msg'];
                    } else {
                        msg = _t('This customer does not have a valid passport, country or birthdate')
                    }
                    this.gui.show_popup('confirm',{
                        'title': _t('Please select a valid customer'),
                        'body': msg,
                        confirm: function(){
                            self.gui.show_screen('clientlist', null, refresh_screen);
                        },
                    });
            } else if ("code" in error && error['code'] == '9584') {
                this.gui.show_popup('error',{
                    'title': _t('VAT Incorrect'),
                    'body': _t('The invoice does not have VAT'),    
                });
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
        },

        display_client_details: function(visibility,partner,clickpos){
            var self = this;

            var contents = this.$('.client-details-contents');
            contents.off('click','.button.scan-passport');
            contents.on('click','.button.scan-passport',function(){ self.scan_client_details(partner); });

            return self._super(visibility,partner,clickpos);
        },

        scan_client_details: function(partner) {
            var self = this;

            function check_digit(e,cdigit) {
                ponder = [7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1,7,3,1];
                valorletra = {'A':10,'B':11,'C':12,'D':13,'E':14,'F':15,'G':16,'H':17,'I':18,'J':19,'K':20,'L':21,'M':22,'N':23,'O':24,'P':25, 'Q':26,'R':27,'S':28,'T':29,'U':30,'V':31,'W':32,'X':33,'Y':34,'Z':35,'<':0,';':0};

                try {
                    var suma1 = 0;
                    var i = 0;

                    e = e.toUpperCase()

                    for (x in e) {
                        var s = e.charAt(x);
                        if (!isNaN(s)) {
                            suma1 = suma1+(Number(s)*ponder[i]);
                        } else if (s in valorletra) {
                            suma1 = suma1+(valorletra[s]*ponder[i]);
                        } else {
                            return false;
                        }
                        i=i+1;
                    }

                    if ((suma1)%10 != Number(cdigit)) {
                        return false;
                    } else {
                        return true;
                    }

                } catch(err) {
                    console.log("ERROR "+err);
                    return false;
                }
            }

            var opcion = "";

            while (opcion !=null) {
                opcion = prompt("Introduzca pasaporte/QR:");

                if (opcion == null) {
                    continue;
                }

                if (opcion == "") {
                    alert("Introduzca un pasaporte/QR");
                    continue;
                }

                opcion = opcion.trim();

                if (opcion.substring(opcion.length-1, opcion.length)=="#") {
                    try {
                        var campos = atob(opcion.substring(0,opcion.length-1)).split("*");
                        var name = campos[0];
                        var country = campos[2];
                        var passport = campos[1];
                        var date = $.datepicker.parseDate('yymmdd', campos[3]);

                        self.set_client_details(name,passport,date,country);
                        opcion = null;
                    } catch(err) {
                        alert("Pasaporte/QR introducido erroneo");
                        return;
                    }


                } else if (opcion.substring(0,1) == "P" && opcion.length>=88) {
                    var cdigit1 = opcion.charAt(53);
                    var cdigit2 = opcion.charAt(63);
                    var control1 = opcion.substring(44,53);
                    var control2 = opcion.substring(57,63);

                    if (!check_digit(control1,cdigit1) || !check_digit(control2,cdigit2)) {
                        alert("Pasaporte/QR introducido erroneo");
                        return;
                    }

                    var date;
                    try {
                        date = $.datepicker.parseDate('ymmdd', opcion.substring(57,63));
                    } catch(err) {
                        alert("Pasaporte/QR introducido erroneo");
                        return;

                    }

                    var name = opcion.substring(5,44).replaceAll("<"," ").replaceAll(";"," ").replaceAll('0',"O").replaceAll("1","I").replaceAll(/\s\s+/g, ' ').trim();
                    var country = opcion.substring(2,5);
                    var passport = opcion.substring(44,53).replaceAll('<','').replaceAll(';','');

                    self.set_client_details(name,passport,date,country);
                    opcion = null;



                } else {
                    alert("Pasaporte/QR introducido erroneo");
                }
            }

        },

        set_client_details: function(name,passport,datebirth,country) {
            var self = this;
            $('.detail.client-name').val(name);
            $('.detail.client-passport').val(passport);
            $('.detail.client-birthdate').val(datebirth.toISOString().split('T')[0]);

            if (country.length==2) {
                iso2 = country;
            } else {
                iso2 = iso3166.codes[country];
            }

            if (iso2!=undefined) {
                var res = rpc.query({
                    model: 'res.country',
                    method: 'search_read',
                    domain: [['code', '=', iso2]],
                    fields: ['id','name']
                }).then(function (country_id) {
                    if (country_id.length > 0 && country_id[0]["id"]) {
                        if (self.pos.config.experimental_country) {
                            var $select = $('select[name="country_id"]').selectize();
                            $select[0].selectize.setValue(country_id[0]["id"]);
                        } else {
                            $('.detail.client-address-country').val(country_id[0]["id"]).change();
                        }
                    }
                });

            }
        }
    });



});

