// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Arthur Brugière';
export const SITE_DESCRIPTION = 'Computer Researcher / IT Nerd';

export const CV_URL = '/resume.pdf';

export const CONTACT = {
  organization: 'Arthur Brugière',
  addressLines: [
    'Hanoi, Vietnam',
  ],
  emails: [
    'arthur.brugiere@ird.fr',
  ],
};

export type SocialIcon = 'website' | 'scholar' | 'email' | 'github' | 'linkedin';

export const SOCIAL_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  icon: SocialIcon;
}> = [
  {
    label: 'Email',
    href: 'mailto:contact@arthurbrugiere.fr',
    icon: 'email',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/RoiArthurB',
    icon: 'github',
  },
  {
    label: 'Google Scholar',
    href: 'https://scholar.google.com/citations?user=Zk8mYXoAAAAJ',
    icon: 'scholar',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/arthurbrugiere/',
    icon: 'linkedin',
  },
];

export const FOOTER_CREDIT = {
  designerName: 'Shravan Goswami',
  designerUrl: 'https://shravangoswami.com',
  sourceLabel: 'Open Source',
  sourceUrl: 'https://github.com/shravanngoswamii/astro-scholar',
};
