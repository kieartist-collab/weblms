import { Phone, Mail, Facebook, MessageCircle, UserRound } from 'lucide-react';

export const contact = {
  name: 'Kistein Do',
  phone: '090.222.2612',
  phoneHref: 'tel:+84902222612',
  zalo: 'https://zalo.me/0902222612',
  email: 'kieartist@gmail.com',
  facebook: 'https://web.facebook.com/kieartist/',
};

export function ContactInfo() {
  return (
    <address className="contact-info">
      <strong>
        <UserRound size={17} aria-hidden="true" />
        {contact.name}
      </strong>
      <a href={contact.phoneHref}>
        <Phone size={17} aria-hidden="true" />
        Số điện thoại: {contact.phone}
      </a>
      <a href={contact.zalo} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={17} aria-hidden="true" />
        Zalo: {contact.phone}
      </a>
      <a href={`mailto:${contact.email}`}>
        <Mail size={17} aria-hidden="true" />
        {contact.email}
      </a>
      <a href={contact.facebook} target="_blank" rel="noopener noreferrer">
        <Facebook size={17} aria-hidden="true" />
        Facebook · {contact.name}
      </a>
    </address>
  );
}
