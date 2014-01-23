UmbrellawebFormAjaxValidatorBundle
========================

Symfony 2 Forms Ajax Validator

## INSTALLATION

register the Bundle UmbrellawebFormAjaxValidatorBundle in app/AppKernel.php:

    new Umbrellaweb\Bundle\FormAjaxValidatorBundle\UmbrellawebFormAjaxValidatorBundle(),

add `UmbrellawebFormAjaxValidatorBundle` to the `assetic.bundles` config to use the `{% javascripts %}` tag in the bundle

## USAGE

import the bundle macroses:
 
    {% import 'UmbrellawebFormAjaxValidatorBundle::Macros/general.html.twig' as uw_afv %}

load the js lib:

    {{ uw_afv.load_validator() }}

init the for validator in your template with:
   
    $(document).ready(function(){
        $('#myForm').ajaxValidate();
    })

or just call the macro from the bundle:

    {{ uw_afv.initValidator(%jquery selector%) }}

`jquery selector` - selector to find form element, `'form'` by default.

**Available options for ajaxValidate:**

sSrc - source to submit a form for validation, form `action` attribute by default

sMethod - method for submission, `method` attribute by default

sDataType - response type, 'json' by default

fnBeforeValidation - callback will called before sending the request, dafault: `function(jqXHR, settings) {}`

fnAfterValidation - callback will called after rendering the errors, deafult: `function(data, textStatus, jqXHR) {}`

fnAjaxErrorCallback: callback to handle the AJAX request errors, default: `function(jqXHR, textStatus, errorThrown) {}`


add the next lines to form controller action just after form handling (`$form->handleRequest($request);`):

    if($request->isXmlHttpRequest())
            return new \Umbrellaweb\Bundle\FormAjaxValidatorBundle\Component\HttpFoundation\AjaxValidatorJsonResponse($form);
