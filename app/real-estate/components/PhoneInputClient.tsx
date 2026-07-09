'use client';

// CSS is imported here so it only loads when this component is dynamically
// imported — keeping it out of the critical render-blocking path.
import 'react-phone-input-2/lib/style.css';
import PhoneInput from 'react-phone-input-2';

export default PhoneInput;
