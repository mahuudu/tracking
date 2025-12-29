export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }

  return null;
}

export function setCookie(name: string, value: string, days: number): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';

    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;

    if (getCookie(name) === value) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function removeCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

