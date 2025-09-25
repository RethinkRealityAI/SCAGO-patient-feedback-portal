export const regexPresets = [
    {
      label: 'Email',
      value: '^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$',
    },
    {
      label: 'Phone Number (North America)',
      value: '^(\\+\\d{1,2}\\s)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$',
    },
    {
      label: 'URL',
      value: '^(https?|ftp|file)://[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|]$',
    },
    {
      label: 'Postal Code (Canada)',
      value: '^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$',
    },
    {
        label: 'Zip Code (USA)',
        value: '^\\d{5}(?:[-\\s]\\d{4})?$',
    },
    {
        label: 'Only Letters',
        value: '^[a-zA-Z]+$',
    },
    {
        label: 'Only Numbers',
        value: '^[0-9]+$',
    }
  ];
  