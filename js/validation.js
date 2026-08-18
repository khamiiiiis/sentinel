// Sentinel - client-side input validation.
//
// Every input that should be constrained gets a data-validate="<type>"
// attribute in index.html. This file watches for input/blur events on
// any such field (including ones added later by innerHTML re-renders,
// via event delegation on document) and rejects values that don't
// match the expected shape - rejecting means: flag it red, show an
// inline reason, and refuse to let the form submit until it's fixed.
//
// This is a UX layer, not the security boundary - the backend
// (validators.py) re-checks everything server-side regardless, since
// anyone can bypass the browser and call the API directly.

const VALIDATORS = {
  ip: {
    test(v) {
      if (v === '') return true; // optional fields
      // IPv4, optionally /CIDR, or a plausible IPv6 (hex groups + colons,
      // optional zone/CIDR). Deliberately permissive on IPv6 shorthand
      // forms; the backend does the authoritative parse.
      const ipv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(\/(3[0-2]|[12]?\d))?$/;
      const ipv6 = /^[0-9a-fA-F:]+(\/\d{1,3})?$/;
      return ipv4.test(v) || (v.includes(':') && ipv6.test(v));
    },
    message: 'enter a valid IP address (e.g. 192.168.1.10)',
  },
  port: {
    test(v) {
      if (v === '') return true;
      if (!/^\d+$/.test(v)) return false;
      const n = Number(v);
      return n >= 1 && n <= 65535;
    },
    message: 'port must be a number between 1 and 65535',
  },
  username: {
    test(v) {
      if (v === '') return true;
      return /^[A-Za-z0-9_.-]{3,32}$/.test(v);
    },
    message: '3-32 characters: letters, numbers, . _ - only',
  },
  'program-path': {
    test(v) {
      if (v === '') return true;
      return /^[A-Za-z0-9\\/:._\-() ]{1,260}$/.test(v);
    },
    message: 'only letters, numbers, spaces, and \\ / : . _ - ( ) are allowed',
  },
  'safe-text': {
    // General free-text fields (search/filter boxes, display names):
    // block the characters that matter for HTML/script/command
    // injection while staying permissive otherwise. These fields never
    // reach sqlite or a shell as anything other than a parameter or a
    // client-side filter, but rejecting the classic metacharacters up
    // front costs nothing and matches what the person asked for.
    test(v) {
      if (v === '') return true;
      if (v.length > 200) return false;
      return !/[<>"'`;|&$\x00-\x1f]/.test(v);
    },
    message: 'remove special characters like < > " \' ` ; | & $',
  },
};

function _fieldError(el) {
  let err = el.parentElement && el.parentElement.querySelector(':scope > .field-error-msg');
  if (!err) {
    err = document.createElement('div');
    err.className = 'field-error-msg';
    el.insertAdjacentElement('afterend', err);
  }
  return err;
}

function validateInput(el) {
  const type = el.dataset.validate;
  const rule = VALIDATORS[type];
  if (!rule) return true;
  const ok = rule.test(el.value.trim());
  el.classList.toggle('field-invalid', !ok);
  const errEl = _fieldError(el);
  errEl.textContent = ok ? '' : rule.message;
  return ok;
}

function validateForm(formEl) {
  let allValid = true;
  formEl.querySelectorAll('[data-validate]').forEach((el) => {
    if (!validateInput(el)) allValid = false;
  });
  return allValid;
}

document.addEventListener('input', (e) => {
  if (e.target.matches && e.target.matches('[data-validate]')) validateInput(e.target);
});
document.addEventListener('blur', (e) => {
  if (e.target.matches && e.target.matches('[data-validate]')) validateInput(e.target);
}, true);
