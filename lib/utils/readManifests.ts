import * as YAML from 'js-yaml';
import * as fs from 'fs';

/**
 * Path and files to apply
 * @param filePath 
 */

export function loadManifestYaml(filePath: string): any[] {
  const yamlFile = fs.readFileSync(filePath, 'utf8');
  const yamlData = YAML.safeLoadAll(yamlFile);
  return yamlData;
}

/**
 * Path with all manifests
 * @param dirPath 
 */
export function loadManifestYamlAll(dirPath: string): any[] {
  const files = fs.readdirSync(dirPath).filter((fileName: string) => fileName.endsWith('.yaml'));
  const manifests: any[] = []; 
  files.forEach((file) => manifests.push(...loadManifestYaml(`${dirPath}/${file}`)));
  return manifests;
}
