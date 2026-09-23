/**
 * Supplier KYC validation.
 *
 * A GSTIN is structured and self-checking, so a lot can be verified offline
 * before any human looks at it. None of this replaces an admin approving the
 * business — it just stops obviously bogus registrations from reaching them.
 */

const GST_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Indian state/UT codes that can legitimately start a GSTIN. */
const STATE_CODES = new Set([
  '01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18',
  '19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36',
  '37','38','97','99',
]);

/**
 * Verify the GSTIN check digit.
 *
 * Each of the first 14 characters is weighted alternately by 1 and 2; the
 * product's digits (base 36) are summed, and the 15th character must make the
 * running total a multiple of 36.
 */
function gstChecksumValid(gstin) {
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const value = GST_CHARSET.indexOf(gstin[i]);
    if (value < 0) return false;
    const product = value * (i % 2 === 0 ? 1 : 2);
    total += Math.floor(product / 36) + (product % 36);
  }
  const expected = GST_CHARSET[(36 - (total % 36)) % 36];
  return expected === gstin[14];
}

/**
 * Validate a GSTIN fully: shape, state code, the fixed 'Z', and check digit.
 * Returns { valid, reason, state_code, pan }.
 */
export function validateGstin(raw) {
  const gstin = String(raw || '').toUpperCase().replace(/\s/g, '');

  if (gstin.length !== 15) return { valid: false, reason: 'A GSTIN is 15 characters long' };
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
    return { valid: false, reason: 'That does not look like a valid GSTIN' };
  }
  const stateCode = gstin.slice(0, 2);
  if (!STATE_CODES.has(stateCode)) {
    return { valid: false, reason: `${stateCode} is not a valid state code` };
  }
  if (gstin[13] !== 'Z') {
    return { valid: false, reason: 'The 14th character of a GSTIN must be Z' };
  }
  if (!gstChecksumValid(gstin)) {
    return { valid: false, reason: 'GSTIN check digit does not match — please re-check it' };
  }
  return {
    valid: true,
    gstin,
    state_code: stateCode,
    // Characters 3-12 of a GSTIN are the holder's PAN.
    pan: gstin.slice(2, 12),
  };
}

/** Indian PIN codes are six digits and never start with zero. */
export function validatePincode(raw) {
  const pin = String(raw || '').replace(/\s/g, '');
  if (!/^[1-9][0-9]{5}$/.test(pin)) return { valid: false, reason: 'Enter a valid 6-digit PIN code' };
  return { valid: true, pincode: pin };
}

export const SUPPLIER_TYPES = ['retail_store', 'brand_store', 'authorised_reseller', 'wholesaler', 'distributor'];

/**
 * Validate a full supplier registration.
 * Returns { valid, errors: {field: message}, values }.
 */
export function validateSupplierRegistration(body) {
  const errors = {};
  const values = {};

  const name = String(body.business_name || '').trim();
  if (name.length < 3) errors.business_name = 'Enter your registered business name';
  else values.business_name = name;

  const gst = validateGstin(body.gst);
  if (!gst.valid) errors.gst = gst.reason;
  else {
    values.gst = gst.gstin;
    values.gst_state_code = gst.state_code;
    values.pan = gst.pan;
  }

  const address = String(body.address || '').trim();
  if (address.length < 10) errors.address = 'Enter the full registered address';
  else values.address = address;

  const city = String(body.city || '').trim();
  if (city.length < 2) errors.city = 'Enter the city';
  else values.city = city;

  const pin = validatePincode(body.pincode);
  if (!pin.valid) errors.pincode = pin.reason;
  else values.pincode = pin.pincode;

  const type = String(body.supplier_type || '').trim();
  if (!SUPPLIER_TYPES.includes(type)) errors.supplier_type = 'Choose the kind of business you run';
  else values.supplier_type = type;

  const contact = String(body.contact_name || '').trim();
  if (contact.length < 3) errors.contact_name = 'Enter the name of the person we should contact';
  else values.contact_name = contact;

  return { valid: Object.keys(errors).length === 0, errors, values };
}
