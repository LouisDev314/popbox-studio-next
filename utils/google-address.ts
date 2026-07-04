import { type ShippingAddress } from '@/interfaces/checkout';
import { isCanadianProvinceCode } from '@/utils/checkout';

type NormalizedGoogleShippingAddress = Partial<Pick<
  ShippingAddress,
  'city' | 'countryCode' | 'line1' | 'postalCode' | 'province'
>>;

export interface GoogleAddressComponent {
  long_name?: string;
  longText?: string;
  short_name?: string;
  shortText?: string;
  types: string[];
}

function getAddressComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  field: 'long' | 'short' = 'long',
): string {
  const component = components?.find((currentComponent) => currentComponent.types.includes(type));

  if (!component) {
    return '';
  }

  if (field === 'short') {
    return (component.shortText ?? component.short_name ?? '').trim();
  }

  return (component.longText ?? component.long_name ?? '').trim();
}

export function normalizeGooglePlaceToShippingAddress(params: {
  addressComponents: GoogleAddressComponent[] | undefined;
  fallbackDescription: string;
}): NormalizedGoogleShippingAddress {
  const streetNumber = getAddressComponent(params.addressComponents, 'street_number');
  const route = getAddressComponent(params.addressComponents, 'route');
  const line1 = [streetNumber, route].filter(Boolean).join(' ') || params.fallbackDescription.trim();
  const city =
    getAddressComponent(params.addressComponents, 'locality')
    || getAddressComponent(params.addressComponents, 'postal_town')
    || getAddressComponent(params.addressComponents, 'administrative_area_level_3');
  const province = getAddressComponent(params.addressComponents, 'administrative_area_level_1', 'short').toUpperCase();
  const postalCode = getAddressComponent(params.addressComponents, 'postal_code');
  const countryCode = getAddressComponent(params.addressComponents, 'country', 'short').toUpperCase();
  const normalizedAddress: NormalizedGoogleShippingAddress = {};

  if (line1) {
    normalizedAddress.line1 = line1;
  }

  if (city) {
    normalizedAddress.city = city;
  }

  if (countryCode === 'CA') {
    normalizedAddress.countryCode = 'CA';
  }

  if (countryCode === 'CA' && isCanadianProvinceCode(province)) {
    normalizedAddress.province = province;
  }

  if (postalCode) {
    normalizedAddress.postalCode = postalCode;
  }

  return normalizedAddress;
}
