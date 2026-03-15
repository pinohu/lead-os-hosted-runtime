import type { GeneratedDeploymentPackage } from "./embed-deployment.ts";
import type { TenantConfig } from "./tenant.ts";

export type GeneratedWordPressPluginPackage = {
  slug: string;
  pluginName: string;
  fileName: string;
  downloadPath: string;
  shortcode: string;
  phpSource: string;
  readme: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapePhpString(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function toPhpValue(value: string | undefined) {
  return value == null ? "''" : `'${escapePhpString(value)}'`;
}

function buildDefaultConfigPhp(bundle: GeneratedDeploymentPackage["bundle"], deployment: GeneratedDeploymentPackage) {
  const config = {
    runtimeBaseUrl: bundle.hostedUrl.replace(new URL(bundle.hostedUrl).pathname, ""),
    niche: deployment.niche,
    service: deployment.entrypointPreset.service,
    family: deployment.entrypointPreset.family,
    mode: deployment.entrypointPreset.mode,
    entrypoint: deployment.entrypointPreset.id,
    audience: deployment.audience,
    pageType: deployment.pageType,
    zip: deployment.bundle.bootEndpoint.includes("zip=") ? new URL(deployment.bundle.bootEndpoint).searchParams.get("zip") ?? "" : "",
    city: deployment.bundle.bootEndpoint.includes("city=") ? new URL(deployment.bundle.bootEndpoint).searchParams.get("city") ?? "" : "",
    launcherLabel: deployment.bundle.launcherLabel,
  };

  return [
    "array(",
    `  'runtimeBaseUrl' => ${toPhpValue(config.runtimeBaseUrl)},`,
    `  'niche' => ${toPhpValue(config.niche)},`,
    `  'service' => ${toPhpValue(config.service)},`,
    `  'family' => ${toPhpValue(config.family)},`,
    `  'mode' => ${toPhpValue(config.mode)},`,
    `  'entrypoint' => ${toPhpValue(config.entrypoint)},`,
    `  'audience' => ${toPhpValue(config.audience)},`,
    `  'pageType' => ${toPhpValue(config.pageType)},`,
    `  'zip' => ${toPhpValue(config.zip)},`,
    `  'city' => ${toPhpValue(config.city)},`,
    `  'launcherLabel' => ${toPhpValue(config.launcherLabel)},`,
    ")",
  ].join("\n");
}

export function generateWordPressPluginPackage(
  deployment: GeneratedDeploymentPackage,
  tenantConfig: TenantConfig,
): GeneratedWordPressPluginPackage {
  const pluginSlug = slugify([
    "lead-os",
    deployment.entrypointPreset.kind,
    deployment.pageType,
    deployment.bundle.launcherLabel,
  ].join("-"));
  const pluginName = `${tenantConfig.brandName} ${deployment.entrypointPreset.label}`;
  const fileName = `${pluginSlug}.php`;
  const shortcode = "[leados_embed]";
  const defaultConfigPhp = buildDefaultConfigPhp(deployment.bundle, deployment);
  const downloadQuery = new URLSearchParams({
    entrypoint: deployment.entrypointPreset.id,
    pageType: deployment.pageType,
    niche: deployment.niche,
    audience: deployment.audience,
    service: deployment.entrypointPreset.service,
    family: deployment.entrypointPreset.family,
    mode: deployment.entrypointPreset.mode,
    launcherLabel: deployment.bundle.launcherLabel,
    download: "1",
  });
  const bootUrl = new URL(deployment.bundle.bootEndpoint);
  const zip = bootUrl.searchParams.get("zip");
  const city = bootUrl.searchParams.get("city");
  if (zip) downloadQuery.set("zip", zip);
  if (city) downloadQuery.set("city", city);
  const downloadPath = `${tenantConfig.siteUrl}/api/embed/wordpress-plugin?${downloadQuery.toString()}`;

  const phpSource = `<?php
/**
 * Plugin Name: ${pluginName}
 * Description: Generated LeadOS deployment plugin for ${deployment.entrypointPreset.label}.
 * Version: 0.1.0
 * Author: ${tenantConfig.brandName}
 */

if (!defined('ABSPATH')) {
    exit;
}

function leados_generated_default_config() {
    return ${defaultConfigPhp};
}

function leados_generated_enqueue_runtime() {
    wp_enqueue_script(
        'leados-generated-runtime',
        '${tenantConfig.siteUrl}/embed/lead-os-embed.js',
        array(),
        null,
        true
    );
}
add_action('wp_enqueue_scripts', 'leados_generated_enqueue_runtime');

function leados_generated_render_embed($atts = array()) {
    $defaults = leados_generated_default_config();
    $merged = shortcode_atts(
        array(
            'runtimeBaseUrl' => $defaults['runtimeBaseUrl'],
            'niche' => $defaults['niche'],
            'service' => $defaults['service'],
            'family' => $defaults['family'],
            'mode' => $defaults['mode'],
            'entrypoint' => $defaults['entrypoint'],
            'audience' => $defaults['audience'],
            'pageType' => $defaults['pageType'],
            'zip' => $defaults['zip'],
            'city' => $defaults['city'],
            'launcherLabel' => $defaults['launcherLabel'],
        ),
        $atts,
        'leados_embed'
    );

    $config = array_filter($merged, function ($value) {
        return $value !== null && $value !== '';
    });

    ob_start();
    ?>
    <div class="leados-embed-slot" data-leados-entrypoint="<?php echo esc_attr($config['entrypoint']); ?>"></div>
    <script>
      window.LeadOSConfig = Object.assign({}, window.LeadOSConfig || {}, <?php echo wp_json_encode($config); ?>);
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('leados_embed', 'leados_generated_render_embed');

function leados_generated_maybe_render_sitewide() {
    if (apply_filters('leados_generated_sitewide_enabled', false) !== true) {
        return;
    }
    echo leados_generated_render_embed();
}
add_action('wp_footer', 'leados_generated_maybe_render_sitewide');
`;

  const readme = [
    `${pluginName}`,
    "",
    "Installation:",
    "1. Upload the generated PHP file to wp-content/plugins or install it as a simple custom plugin.",
    "2. Activate the plugin in WordPress.",
    `3. Use the shortcode ${shortcode} in Gutenberg, Classic Editor, or a shortcode block.`,
    "4. If you want sitewide launch behavior, enable the filter `leados_generated_sitewide_enabled` in your theme or mu-plugin.",
    "",
    "Supported shortcode overrides:",
    "- launcherLabel",
    "- zip",
    "- city",
    "- service",
    "- mode",
    "- pageType",
    "",
    "Generated hosted URL:",
    deployment.bundle.hostedUrl,
    "",
    "Generated widget boot endpoint:",
    deployment.bundle.bootEndpoint,
  ].join("\n");

  return {
    slug: pluginSlug,
    pluginName,
    fileName,
    downloadPath,
    shortcode,
    phpSource,
    readme,
  };
}
