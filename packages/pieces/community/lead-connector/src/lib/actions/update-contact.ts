import {
  createAction,
  Property,
  Validators,
} from '@activepieces/pieces-framework';
import {
  Country,
  getCountries,
  getTags,
  getTimezones,
  LeadConnectorContactDto,
  updateContact,
} from '../common';
import { leadConnectorAuth } from '../..';

export const updateContactAction = createAction({
  auth: leadConnectorAuth,
  name: 'update_contact',
  displayName: 'Update Contact',
  description: 'Update an existing contact.',
  props: {
    id: Property.ShortText({
      displayName: 'Contact ID',
      description: 'The ID of the contact.',
      required: true,
    }),
    firstName: Property.ShortText({
      displayName: 'First Name',
      required: false,
    }),
    lastName: Property.ShortText({
      displayName: 'Last Name',
      required: false,
    }),
    email: Property.ShortText({
      displayName: 'Email',
      required: false,
      validators: [Validators.email],
    }),
    phone: Property.ShortText({
      displayName: 'Phone',
      required: false,
      validators: [Validators.phoneNumber],
    }),
    companyName: Property.ShortText({
      displayName: 'Company Name',
      required: false,
    }),
    website: Property.ShortText({
      displayName: 'Website',
      required: false,
      validators: [Validators.url],
    }),
    tags: Property.MultiSelectDropdown({
      displayName: 'Tags',
      required: false,
      refreshers: [],
      options: async ({ auth }) => {
        if (!auth)
          return {
            disabled: true,
            options: [],
          };

        const tags = await getTags(auth as string);
        return {
          options: tags.map((tag) => {
            return {
              label: tag.name,
              value: tag.name,
            };
          }),
        };
      },
    }),
    source: Property.ShortText({
      displayName: 'Source',
      required: false,
    }),
    country: Property.Dropdown({
      displayName: 'Country',
      description:
        'When using a dynamic value, make sure to use the ISO-2 country code, and not the country name.',
      required: false,
      refreshers: [],
      options: async () => {
        const countries = await getCountries();
        return {
          options: countries.map((country: Country) => {
            return {
              label: country.name,
              value: country.iso2Code,
            };
          }),
        };
      },
    }),
    city: Property.ShortText({
      displayName: 'City',
      required: false,
    }),
    state: Property.ShortText({
      displayName: 'State',
      required: false,
    }),
    address: Property.LongText({
      displayName: 'Address',
      required: false,
    }),
    postalCode: Property.ShortText({
      displayName: 'Postal Code',
      required: false,
    }),
    timezone: Property.Dropdown({
      displayName: 'Time Zone',
      required: false,
      refreshers: [],
      options: async ({ auth }) => {
        if (!auth)
          return {
            disabled: true,
            options: [],
          };

        const timezones = await getTimezones(auth as string);
        return {
          options: timezones.map((timezone) => {
            return {
              label: timezone,
              value: timezone,
            };
          }),
        };
      },
    }),
  },

  async run({ auth, propsValue }) {
    const {
      id,
      firstName,
      lastName,
      email,
      phone,
      companyName,
      website,
      tags,
      source,
      country,
      city,
      state,
      address,
      postalCode,
      timezone,
    } = propsValue;

    const contact: LeadConnectorContactDto = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      companyName: companyName,
      website: website,
      tags: tags,
      source: source,
      country: country,
      city: city,
      state: state,
      address: address,
      postalCode: postalCode,
      timezone: timezone,
    };

    return await updateContact(auth, id, contact);
  },
});
