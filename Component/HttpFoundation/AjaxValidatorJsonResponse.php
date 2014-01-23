<?php

namespace Umbrellaweb\Bundle\FormAjaxValidatorBundle\Component\HttpFoundation;

use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * AjaxValidatorJsonResponse - builds a JSON response for form validation results
 *
 * @author Umbrella-web <http://umbrella-web.com>
 */
class AjaxValidatorJsonResponse extends JsonResponse
{

    /**
     * 
     * @param \Symfony\Component\Form\Form $data
     * @param string $status
     * @param array $headers
     */
    public function __construct($data = null, $status = 200, $headers = array())
    {
        // build data
        if (!$data instanceof \Symfony\Component\Form\Form)
            throw new Exception('Invalid data for ' . __CLASS__ . '. Instance of \Symfony\Component\Form\Form expected.');

        parent::__construct($this->_buildData($data), $status, $headers);
    }

    protected function _buildData(\Symfony\Component\Form\Form $form)
    {
        if ($form->isValid())
            return array('status' => 'success');

        $errors = $this->_getFormErrors($form);
        
        if (empty($errors))
            return array('status' => 'success');
        
        return array(
            'status' => 'failure',
            'errors' => $errors,
        );
    }

    protected function _getFormErrors($form)
    {
        $errors = array();
        
        // get form errors first
        foreach($form->getErrors() as $err)
        {
            if($form->isRoot())
                $errors['__GLOBAL__'][] = $err->getMessage();
            else
                $errors[] = $err->getMessage();
        }
        
        // check if form has any children
        if($form->count() > 0)
        {
            // get errors from form child
            foreach ($form->getIterator() as $key => $child)
            {
                if($child_err = $this->_getFormErrors($child))
                    $errors[$key] = $child_err;
            }
        }
        
        return $errors;
    }

}
