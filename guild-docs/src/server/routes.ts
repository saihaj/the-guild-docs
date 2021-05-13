import { readFileSync } from 'fs';
import globby from 'globby';
import matter from 'gray-matter';

import type { IRoutes } from '../types';

export function getSlug({ path, replaceBasePath }: { path: string; replaceBasePath?: string }) {
  let slugPath = path.replace(/\.mdx?$/, '');

  if (replaceBasePath) slugPath = slugPath.replace(replaceBasePath, '');

  const slug = slugPath.split('/').filter(v => !!v);

  return slug;
}

export interface AddRoutesConfig {
  Routes?: IRoutes;
  folderPattern: string;
  basePath?: string;
  basePathLabel?: string;
  replaceBasePath?: string;
  labels?: Record<string, string | undefined>;
}

export function GenerateRoutes(config: AddRoutesConfig) {
  const { basePath, basePathLabel, folderPattern, Routes = {}, replaceBasePath = config.folderPattern, labels = {} } = config;

  const baseRoutes: IRoutes = basePathLabel ? ({ $name: basePathLabel } as IRoutes) : {};

  for (const path of globby.sync(folderPattern)) {
    if (!/\.mdx?$/.test(path)) continue;

    const md = readFileSync(path);

    const { data } = matter(md);

    const slugList = getSlug({
      path,
      replaceBasePath,
    });

    let currentRoute = basePath ? ((Routes._ ||= {})[basePath] ||= baseRoutes) : Routes;

    let acumSlug = '';
    for (const [index, slug] of slugList.entries()) {
      acumSlug += slug;
      if (index === slugList.length - 1) {
        const currentRouteRoutes = (currentRoute.$routes ||= []);
        const existingRouteIndex = currentRouteRoutes.findIndex(v => (Array.isArray(v) ? v[0] : v) === slug);
        const existingRoute = currentRouteRoutes[existingRouteIndex];

        // Only overwrite the titles and prevent duplication of routes
        if (existingRoute) {
          if (data.title || labels[acumSlug]) {
            currentRouteRoutes[existingRouteIndex] = [
              Array.isArray(existingRoute) ? existingRoute[0] : existingRoute,
              data.title || labels[acumSlug],
            ];
          }
        } else {
          currentRouteRoutes.push([slug, data.title || labels[acumSlug] || slug]);
        }
      } else {
        currentRoute = (currentRoute._ ||= {})[slug] ||= {};

        labels[acumSlug] && (currentRoute.$name = labels[acumSlug]);
      }

      acumSlug += '.';
    }
  }

  return Routes;
}
