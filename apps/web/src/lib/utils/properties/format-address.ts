import type { TAddressData } from '@kws/types';

export const getAddressStreet = (address: TAddressData): string => {
  const { streetNumber, streetDirPrefix, streetName, streetSuffix, streetDirSuffix, unitNumber } =
    address;
  let addressString = '';
  if (streetNumber) {
    addressString += `${streetNumber} `;
  }
  if (streetDirPrefix) {
    addressString += `${streetDirPrefix} `;
  }
  if (streetName) {
    addressString += `${streetName} `;
  }
  if (streetSuffix) {
    addressString += `${streetSuffix} `;
  }
  if (streetDirSuffix) {
    addressString += `${streetDirSuffix} `;
  }
  if (unitNumber) {
    addressString += `#${unitNumber}`;
  }
  return addressString.trim();
};
