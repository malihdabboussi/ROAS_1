;(function () {
  'use strict'

  var script = document.currentScript
  if (!script) return

  var funnelId = script.getAttribute('data-funnel-id')
  if (!funnelId) return

  var apiUrl = script.getAttribute('data-api-url') || location.origin + '/api/leads/ingest'
  var thankYouUrl = script.getAttribute('data-thank-you-url')

  function getFormValue(form, names) {
    for (var i = 0; i < names.length; i++) {
      var el = form.querySelector('[name="' + names[i] + '"]')
      if (el && el.value) return el.value.trim()
    }
    return ''
  }

  function showMessage(el, msg, isError) {
    var div = document.createElement('div')
    div.textContent = msg
    div.style.cssText =
      'padding:12px;margin-top:8px;border-radius:4px;' +
      (isError ? 'background:#fee;color:#c00;' : 'background:#efe;color:#0a0;')
    el.parentNode.insertBefore(div, el.nextSibling)
    setTimeout(function () {
      div.remove()
    }, 5000)
  }

  function setButtonState(btn, loading) {
    if (!btn) return
    btn.disabled = loading
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent
    btn.textContent = loading ? 'Sending…' : btn.dataset.originalText || 'Submit'
  }

  function handleSubmit(e) {
    var form = e.target
    if (form.dataset.captureSubmitted === '1') {
      e.preventDefault()
      return
    }

    e.preventDefault()

    var submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button')
    setButtonState(submitBtn, true)

    var payload = {
      email: getFormValue(form, ['email', 'Email', 'email_address']),
      name: getFormValue(form, ['name', 'Name', 'full_name', 'fullname']),
      phone: getFormValue(form, ['phone', 'Phone', 'tel', 'telephone']),
      funnelId: funnelId,
      pageSlug: window.location.pathname || '/',
      sourceDomain: window.location.hostname || '',
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed')
        form.dataset.captureSubmitted = '1'
        if (thankYouUrl) {
          window.location.href = thankYouUrl
          return
        }
        showMessage(form, 'Thank you!', false)
      })
      .catch(function () {
        showMessage(form, 'Something went wrong. Please try again.', true)
      })
      .finally(function () {
        setButtonState(submitBtn, false)
      })
  }

  var forms = document.querySelectorAll('form')
  for (var i = 0; i < forms.length; i++) {
    forms[i].addEventListener('submit', handleSubmit)
  }
})()
