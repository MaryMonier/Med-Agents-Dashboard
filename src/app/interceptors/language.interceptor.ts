

import { HttpInterceptorFn } from '@angular/common/http';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const lang = localStorage.getItem('preferredLanguage') ?? 'en';

  const cloned = req.clone({
    headers: req.headers.set('Accept-Language', lang),
  });

  return next(cloned);
};
