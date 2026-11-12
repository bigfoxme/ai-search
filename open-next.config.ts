import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 所有页面与接口都是 force-dynamic，没有 ISR/静态增量缓存，
// 因此使用默认的 dummy 缓存，不需要 R2。
export default defineCloudflareConfig();
