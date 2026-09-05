export interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
}

export interface IFooter {
  companyName?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  description: string;
  socialLinks: ISocialLinks;
}
