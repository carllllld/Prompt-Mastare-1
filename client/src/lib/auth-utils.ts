export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Ej inloggad",
      description: "Du har blivit utloggad. Omdirigerar till startsidan...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/";
  }, 500);
}
