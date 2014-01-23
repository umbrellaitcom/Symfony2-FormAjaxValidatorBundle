/**
 * FormAjaxValidator
 * 
 * 1. To initialize a AJAX form validation:
 * 
 * 		$(document).ready(function(){
 *			$('form').ajaxValidate()
 *		})
 *
 * You can see all available options and callbacks in the $.fn.ajaxValidate.defaults
 * 
 * 2. Server should return the response in the json format:
 * 
 * [
 * 		status: 'success|failure',
 * 		errors: 
 * 		{
 * 			%fieldName% : %errorString%, 
 * 			... 
 * 			%fieldName% : %errorString%
 * 		}
 * ]
 * 
 * where 
 *  - status is a response status: success - form is valid, failure - form has a validation errors
 *  - errors is an assoc array of validation errors: key is a fieldName, value is an error string 
 * 
 * All formatters setted for the Twitter Bootstrap 3. In other versions you can override these formatters.
 * 
 * Files are validated if browser supports FormData @see https://developer.mozilla.org/en-US/docs/Web/API/FormData
 * 
 * Version: 1.0
 * Requires: 
 * 	- jQuery v1.10.2 or later
 * 
 * @author Umbrella-web
 * @link http://umbrella-web.com
 */
;
(function($) {

    /**
     * FormAjaxValidator Object
     * 
     * @param {jQuery} $$form jQuery form
     * @param {Object=} options Settings
     * @constructor
     */
    FormAjaxValidator = function(oInit) {

        /**
         * Shortcut to this object
         */
        var self = this;

        self.oDefaultSettings = {
            $Form: null,
            oOptions: {
                //source to submit a form for validation, `action` attribute by default
                sSrc: null,
                //method for submission, `method` attribute by default
                sMethod: null,
                //response type
                sDataType: 'json',
                //callback will called before sending the request
                fnBeforeValidation: function(jqXHR, settings) {
                },
                //callback will called after rendering the errors
                fnAfterValidation: function(data, textStatus, jqXHR) {
                },
                //callback to handle the AJAX request errors
                fnAjaxErrorCallback: function(jqXHR, textStatus, errorThrown) {
                }
            }
        };

        /**
         * build the settings
         */
        self.oSettings = $.extend(true, {}, self.oDefaultSettings, oInit);

        /**
         * DOM elements
         */
        self.oDom = {};

        /**
         * Store the form element we're attached to in the repository
         */
        self.oDom.$Form = self.oSettings.$Form;

        /**
         * Save options in the property
         */
        self.oOptions = self.oSettings.oOptions;

        /**
         * sanitize options
         */
        _fnSanitizeOptions();

        /**
         * Reference to internal private functions. 
         */
        self.oApi = {
            _fnBuildErrorEl: _fnBuildErrorEl,
            _fnRenderErrors: _fnRenderErrors
        };

        /**
         * Active AJAX request
         */
        self.oJqXHR = null;

        self.iErrorQty = 0;

        /**
         * Attach event on Form submit - ajax validate the form
         */
        self.oDom.$Form.on('submit', (function(event) {

            //stop form from submitting normally
            event.preventDefault();

            //abort the previous request
            if (self.oJqXHR != null)
                self.oJqXHR.abort();

            // clear errors qty
            self.iErrorQty = 0;

            // build data & ajax parameters to send depending on if browser supports FormData interface
            var oData;
            var bProcessData = true;
            var mContentType = 'application/x-www-form-urlencoded; charset=UTF-8';
            if (_fnIgnoreFiles())
            {
                oData = self.oDom.$Form.serialize();
            }
            else
            {
                oData = new FormData(self.oDom.$Form.get(0));
                //set to false, because jQuery will convert the files arrays into strings and the server won't be able to pick it up
                bProcessData = false;
                //set to false, because jQuery by default doesn't send the files. Also setting it to multipart/form-data doesn't seem to work either
                mContentType = false;
            }

            //run the request to validate the form
            self.oJqXHR = $.ajax({
                url: self.oOptions.sSrc,
                type: self.oOptions.sMethod,
                data: oData,
                beforeSend: self.oOptions.fnBeforeValidation,
                processData: bProcessData,
                contentType: mContentType,
                success: function(data, textStatus, jqXHR) {

                    self.resetValidation();

                    switch (data.status)
                    {
                        case 'failure':
                            /**
                             * break the submission only if no errors was rendered.
                             * It may be if errored a FILE elements only
                             * @todo get rid of this.
                             */
                            if (self.handleErrors(data.errors))
                                break;

                        case 'success':
                            //submit the form directly
                            event.target.submit();
                            return false;
                            break;
                    }

                    //some callback after validation
                    self.oOptions.fnAfterValidation(data, textStatus, jqXHR);
                },
                error: self.oOptions.fnAjaxErrorCallback,
                dataType: self.oOptions.sDataType
            })

            return false;
        }));

        /**
         * Sanitize options
         */
        function _fnSanitizeOptions() {
            //src must be defined
            if (self.oOptions.sSrc == null)
            {
                self.oOptions.sSrc = self.oDom.$Form.attr('action');
            }

            //method must be defined
            if (self.oOptions.sMethod == null)
            {
                self.oOptions.sMethod = self.oDom.$Form.attr('method');
            }
        }

        /**
         * Shall we ignore files validation errors?
         * This is done so because we cannot send files if FormData is not supported by browser.
         * 
         * @returns {Boolean}
         */
        function _fnIgnoreFiles()
        {
            return window.FormData === undefined;
        }

        /**
         * Build an error element
         * @returns {jQuery object}
         */
        function _fnBuildErrorEl()
        {
            return $('<p>').addClass('text-error');
        }

        /**
         * Render errors
         * 
         * @todo need to refactor field name creating 'if' statements
         * 
         * @param {object} oErrors
         * @param {string} sKey
         */
        function _fnRenderErrors(oErrors, sKey)
        {
            var render = this;

            // set key default value
            sKey = sKey || '';

            render.sName = sKey;

            $.each(oErrors, function(sKey, oError) {


                // render global errors
                if (sKey == '__GLOBAL__')
                {
                    _fnRenderGlobalErrors(oError);
                    return;
                }

                // if the key is integer then add the field only [] to field name
                // if the key is integer and oError is object (mean that is collection element) then add the field [integer] to field name
                // or if [integer] field is already exist in name replace this value by current
                if (_fnIsInt(sKey) && oError instanceof Object)
                {
                    var regex = /\[\d+\]/;

                    if (regex.test(render.sName) == true)
                    {
                        var sName = render.sName.replace(/\[\d+\]/, '[' + sKey + ']');
                    }
                    else
                    {
                        var sName = render.sName + '[' + sKey + ']';
                    }
                }
                else if (_fnIsInt(sKey))
                {
                    if (render.sName == '[phoneNumber]')
                    {
                        var sName = render.sName + '[phone]';
                    }
                    else
                    {
                        var sName = render.sName + '[]';
                    }
                }
                else
                {
                    var sName = render.sName + '[' + sKey + ']';
                }

                var $El = $('[name$="' + sName + '"]', self.oDom.$Form);

                if (sName == '[name]')
                {
                    // remove all elements which names ends by [name] and have numbers,
                    // because this elements may belong to form collection
                    $($El).each(function() {

                        if (/\[\d+\]/.test($(this).attr('name')) == false)
                        {
                            $El = $(this);
                        }

                    });
                }

                // no elements found? - hmmm, it may be a multi field
                if ($El.length == 0 && typeof oError != 'string')
                {
                    _fnRenderErrors(oError, sName);
                    return;// return; is like continue; - go to next iteration
                }
                else if($El.length == 0 && typeof oError == 'string')
                {
                    _fnRenderGlobalErrors(oError);
                }

                // render the element errors
                _fnRenderFieldError($El, oError);
            });
        }

        /**
         * Render a field error
         * @param {jQuery object} $El
         * @param {object} oError
         */
        function _fnRenderFieldError($El, oError)
        {
            var sElType = $El.attr('type');

            switch (sElType)
            {
                case 'file':
                    /**
                     * skip the FILE fields
                     * @todo need to handle a FILE fields.
                     */
                    if (!_fnIgnoreFiles())
                    {
                        $El.closest('div').addClass('form-error');
                        $El.closest('div').append(self.oApi._fnBuildErrorEl().html(oError));
                        self.iErrorQty++;
                    }
                    break;
                case 'hidden':
                    //for hidden fields - render global errors
                    _fnRenderGlobalErrors(oError);
                    self.iErrorQty++;
                    break;
                case 'checkbox':
                case 'radio':
                    $El.closest('.field-box-set').addClass('form-error');
                    $El.closest('.field-box-set').after(self.oApi._fnBuildErrorEl().html(oError));
                    self.iErrorQty++;
                    break;
                default:
                    var $Parent = $El.closest('div');
                    $Parent.addClass('form-error');
                    // check if this is a bootstrap 3 form group field
                    if($Parent.hasClass('input-group'))
                    {
                        $Parent.parent('div').append(self.oApi._fnBuildErrorEl().html(oError));
                    }
                    else
                    {
                        $Parent.append(self.oApi._fnBuildErrorEl().html(oError));
                    }
                    self.iErrorQty++;
                    break;
            }
        }

        /**
         * Render global errors
         * @param {mixed} mError
         */
        function _fnRenderGlobalErrors(mError) 
        {
            // check if there is an array of errors
            if($.isArray(mError))
            {
                $.each(mError, function(sKey, sError) {
                    self.oDom.$Form.prepend(_fnBuildErrorEl().html(sError));
                    self.iErrorQty++;
                });
                return;
            }
            self.oDom.$Form.prepend(_fnBuildErrorEl().html(mError));
            self.iErrorQty++;
        }

        /**
         * Check wether the value is integer
         * @param {mixed} mVal
         * @returns {Boolean}
         */
        function _fnIsInt(mVal)
        {
            var intRegex = /^\d+$/;
            return intRegex.test(mVal);
        }
    };

    /**
     * Reset all previous errors
     * @return
     */
    FormAjaxValidator.prototype.resetValidation = function() {
        var self = this;

        $('.form-error', self.oDom.$Form).removeClass('form-error');
        $('.text-error', self.oDom.$Form).remove();
        return;
    };

    /**
     * Handle errors
     * @return
     */
    FormAjaxValidator.prototype.handleErrors = function(oErrors) {
        var self = this;

        self.oApi._fnRenderErrors(oErrors);
        return self.iErrorQty > 0;
    };

    /**
     * AJAX form validator - jquery method
     */
    $.fn.ajaxValidate = function(oOptions) {

        var self = this;

        if (this.length != 1 || this.get(0).tagName.toUpperCase() !== 'FORM')
        {
            console.error('Incorrect selector for the FormAjaxValidator: jQuery object with one element with FORM tag expected');
            return;
        }

        //build options
        var o = $.extend({}, {
            '$Form': self
        },
        oOptions);

        //attach the FormAjaxValidator to the specified element
        return new FormAjaxValidator(o);

    }
    ;
})(jQuery);