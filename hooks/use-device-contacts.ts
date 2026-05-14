import { useCallback, useEffect, useMemo, useState } from 'react';

import { palette, type Contact } from '@/constants/toppay';

type ExpoContactsModule = typeof import('expo-contacts');
type ExpoContact = Awaited<ReturnType<ExpoContactsModule['getContactsAsync']>>['data'][number];
type ContactsAccessStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable' | null;

const contactColors = [
  palette.primary,
  palette.coral,
  palette.cyan,
  palette.amber,
  '#6D3A9C',
  '#1D63A6',
];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'TP';
}

function formatPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/[^\d+]/g, '');
}

function mapDeviceContact(contact: ExpoContact, index: number): Contact | null {
  const phoneNumber = contact.phoneNumbers?.[0]?.number;

  if (!phoneNumber) {
    return null;
  }

  const name = contact.name || contact.firstName || phoneNumber;

  return {
    name,
    phone: formatPhoneNumber(phoneNumber),
    initials: getInitials(name),
    color: contactColors[index % contactColors.length],
  };
}

export function useDeviceContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<ContactsAccessStatus>(null);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);

    try {
      const Contacts = await import('expo-contacts');
      const permission = await Contacts.requestPermissionsAsync();
      setPermissionStatus(permission.status as ContactsAccessStatus);

      if (permission.status !== 'granted') {
        setContacts([]);
        return;
      }

      const result = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        pageSize: 40,
      });
      const nextContacts = result.data
        .map(mapDeviceContact)
        .filter((contact): contact is Contact => Boolean(contact));

      setContacts(nextContacts);
    } catch (error) {
      console.warn('Device contacts are unavailable in this build:', error);
      setPermissionStatus('unavailable');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  return useMemo(() => ({
    contacts,
    hasPermission: permissionStatus === 'granted',
    isLoading,
    loadContacts,
    permissionStatus,
  }), [contacts, isLoading, loadContacts, permissionStatus]);
}
