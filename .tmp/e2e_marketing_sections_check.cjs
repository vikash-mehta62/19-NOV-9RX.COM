/**
 * Marketing Sections E2E Check
 * Scope: Offers & Promos, Banners, Announcements, Blogs
 * Run: node .tmp/e2e_marketing_sections_check.cjs
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "./server/.env" });
require("dotenv").config({ path: "./.env" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials. Need URL + service role (preferred).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const state = {
  startedAt: new Date().toISOString(),
  modules: {
    offers_promos: { checks: [], score: 0 },
    banners: { checks: [], score: 0 },
    announcements: { checks: [], score: 0 },
    blogs: { checks: [], score: 0 },
    integration: { checks: [], score: 0 },
  },
  totals: { passed: 0, failed: 0, warnings: 0, score: 0 },
  cleanup: { actions: [], failed: [] },
};

const cleanupActions = [];

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addCleanup(label, fn) {
  cleanupActions.push({ label, fn });
}

function addResult(moduleKey, check, status, detail = "") {
  state.modules[moduleKey].checks.push({ check, status, detail });
  if (status === "pass") state.totals.passed += 1;
  if (status === "fail") state.totals.failed += 1;
  if (status === "warn") state.totals.warnings += 1;
}

async function runCheck(moduleKey, check, fn) {
  try {
    const detail = await fn();
    addResult(moduleKey, check, "pass", detail || "");
  } catch (err) {
    addResult(moduleKey, check, "fail", err?.message || String(err));
  }
}

function setModuleScore(moduleKey) {
  const checks = state.modules[moduleKey].checks;
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const total = pass + fail;
  state.modules[moduleKey].score = total === 0 ? 100 : Math.round((pass / total) * 100);
}

function setOverallScore() {
  const pass = state.totals.passed;
  const fail = state.totals.failed;
  const total = pass + fail;
  state.totals.score = total === 0 ? 100 : Math.round((pass / total) * 100);
}

async function safeCleanup() {
  for (let i = cleanupActions.length - 1; i >= 0; i -= 1) {
    const action = cleanupActions[i];
    try {
      await action.fn();
      state.cleanup.actions.push(action.label);
    } catch (err) {
      state.cleanup.failed.push({
        label: action.label,
        error: err?.message || String(err),
      });
    }
  }
}

async function getProductForOfferAndDeal() {
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,name,base_price,sku")
    .order("created_at", { ascending: false })
    .limit(200);
  if (productError) throw new Error(`products query failed: ${productError.message}`);
  if (!products || products.length === 0) return { anyProduct: null, dealProduct: null };

  const anyProduct = products[0];

  const { data: deals, error: dealsErr } = await supabase
    .from("daily_deals")
    .select("product_id");
  if (dealsErr) throw new Error(`daily_deals query failed: ${dealsErr.message}`);
  const used = new Set((deals || []).map((d) => d.product_id));
  const dealProduct = products.find((p) => !used.has(p.id)) || null;
  return { anyProduct, dealProduct };
}

async function testOffersPromos() {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const promoCode = uid("PROMO").toUpperCase();
  const offerTitle = uid("E2E Offer");
  let createdOffer = null;
  let createdDeal = null;
  let createdDealOffer = null;
  let linkedProductId = null;

  const { anyProduct, dealProduct } = await getProductForOfferAndDeal();

  await runCheck("offers_promos", "Create offer row", async () => {
    const payload = {
      title: offerTitle,
      description: "E2E test offer",
      offer_type: "percentage",
      discount_value: 12,
      min_order_amount: 20,
      max_discount_amount: 200,
      promo_code: promoCode,
      usage_limit: 50,
      is_active: true,
      start_date: start,
      end_date: end,
      applicable_to: "all",
      applicable_ids: null,
      user_groups: null,
      image_url: null,
    };
    const { data, error } = await supabase.from("offers").insert([payload]).select("*").single();
    if (error) throw new Error(error.message);
    createdOffer = data;
    addCleanup(`Delete offer ${data.id}`, async () => {
      await supabase.from("offers").delete().eq("id", data.id);
    });
    return `offer_id=${data.id}`;
  });

  await runCheck("offers_promos", "Update offer and toggle active", async () => {
    if (!createdOffer) throw new Error("create offer failed, cannot continue");
    const { error: updateErr } = await supabase
      .from("offers")
      .update({ discount_value: 15, is_active: false })
      .eq("id", createdOffer.id);
    if (updateErr) throw new Error(`update failed: ${updateErr.message}`);

    const { data: readBack, error: readErr } = await supabase
      .from("offers")
      .select("id,discount_value,is_active")
      .eq("id", createdOffer.id)
      .single();
    if (readErr) throw new Error(`read failed: ${readErr.message}`);
    if (Number(readBack.discount_value) !== 15 || readBack.is_active !== false) {
      throw new Error("offer values did not persist");
    }

    const { error: toggleErr } = await supabase
      .from("offers")
      .update({ is_active: true })
      .eq("id", createdOffer.id);
    if (toggleErr) throw new Error(`toggle failed: ${toggleErr.message}`);
    return "update + toggle persisted";
  });

  await runCheck("offers_promos", "Assign product via product_offers (upsert-safe)", async () => {
    if (!createdOffer) throw new Error("offer missing");
    if (!anyProduct) throw new Error("no products found to link");
    linkedProductId = anyProduct.id;

    const row = {
      product_id: anyProduct.id,
      offer_id: createdOffer.id,
      is_active: true,
    };
    const { error: insErr } = await supabase.from("product_offers").insert([row]);
    if (insErr) throw new Error(`insert link failed: ${insErr.message}`);
    addCleanup(`Delete product_offer ${anyProduct.id}/${createdOffer.id}`, async () => {
      await supabase
        .from("product_offers")
        .delete()
        .eq("product_id", anyProduct.id)
        .eq("offer_id", createdOffer.id);
    });

    const { error: upsertErr } = await supabase
      .from("product_offers")
      .upsert([row], { onConflict: "product_id,offer_id" });
    if (upsertErr) throw new Error(`upsert failed: ${upsertErr.message}`);

    const { count, error: cntErr } = await supabase
      .from("product_offers")
      .select("*", { count: "exact", head: true })
      .eq("product_id", anyProduct.id)
      .eq("offer_id", createdOffer.id);
    if (cntErr) throw new Error(`count failed: ${cntErr.message}`);
    if (count !== 1) throw new Error(`expected exactly 1 link row, got ${count}`);
    return `linked product_id=${anyProduct.id}`;
  });

  await runCheck("offers_promos", "Daily deals settings singleton health", async () => {
    const { count, error } = await supabase
      .from("daily_deals_settings")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);

    if (!count || count === 0) {
      const { data: inserted, error: insErr } = await supabase
        .from("daily_deals_settings")
        .insert([
          {
            is_enabled: true,
            section_title: "Deals of the Day",
            section_subtitle: "Limited time offers",
            countdown_enabled: true,
            max_products: 6,
          },
        ])
        .select("id")
        .single();
      if (insErr) throw new Error(`insert settings failed: ${insErr.message}`);
      addCleanup(`Delete daily_deals_settings ${inserted.id}`, async () => {
        await supabase.from("daily_deals_settings").delete().eq("id", inserted.id);
      });
      return "settings row created because none existed";
    }

    if (count > 1) {
      throw new Error(
        `daily_deals_settings has ${count} rows; UI uses maybeSingle and can break on multi-row`
      );
    }

    const { data: row, error: readErr } = await supabase
      .from("daily_deals_settings")
      .select("id,section_title")
      .limit(1)
      .single();
    if (readErr) throw new Error(readErr.message);

    const marker = `${row.section_title || "Deals"} [E2E]`;
    const { error: updateErr } = await supabase
      .from("daily_deals_settings")
      .update({ section_title: marker })
      .eq("id", row.id);
    if (updateErr) throw new Error(`settings update failed: ${updateErr.message}`);
    addCleanup(`Restore daily_deals_settings title ${row.id}`, async () => {
      await supabase.from("daily_deals_settings").update({ section_title: row.section_title }).eq("id", row.id);
    });
    return "single settings row verified";
  });

  if (!dealProduct) {
    addResult(
      "offers_promos",
      "Create daily deal with offer link",
      "warn",
      "skipped: every product already has a daily_deals row (unique product_id)"
    );
  } else {
    await runCheck("offers_promos", "Create daily deal + linked offer flow", async () => {
      const dealPayload = {
        product_id: dealProduct.id,
        discount_percent: 11,
        badge_type: "HOT DEAL",
        is_active: true,
        start_date: start,
        end_date: end,
      };

      const { data: deal, error: dealErr } = await supabase
        .from("daily_deals")
        .insert([dealPayload])
        .select("id,product_id,offer_id,is_active")
        .single();
      if (dealErr) throw new Error(`create deal failed: ${dealErr.message}`);
      createdDeal = deal;
      addCleanup(`Delete daily_deal ${deal.id}`, async () => {
        await supabase.from("daily_deals").delete().eq("id", deal.id);
      });

      const { data: offer, error: offerErr } = await supabase
        .from("offers")
        .insert([
          {
            title: uid("DailyDeal Offer"),
            description: "E2E linked deal offer",
            offer_type: "percentage",
            discount_value: 11,
            is_active: true,
            start_date: start,
            end_date: end,
            applicable_to: "product",
            applicable_ids: [dealProduct.id],
            promo_code: null,
          },
        ])
        .select("id")
        .single();
      if (offerErr) throw new Error(`create linked offer failed: ${offerErr.message}`);
      createdDealOffer = offer;
      addCleanup(`Delete linked offer ${offer.id}`, async () => {
        await supabase.from("offers").delete().eq("id", offer.id);
      });

      const { error: linkErr } = await supabase.from("product_offers").insert([
        {
          product_id: dealProduct.id,
          offer_id: offer.id,
          is_active: true,
        },
      ]);
      if (linkErr) throw new Error(`create product_offers link failed: ${linkErr.message}`);
      addCleanup(`Delete linked product_offer ${dealProduct.id}/${offer.id}`, async () => {
        await supabase.from("product_offers").delete().eq("product_id", dealProduct.id).eq("offer_id", offer.id);
      });

      const { error: dealUpdateErr } = await supabase
        .from("daily_deals")
        .update({ offer_id: offer.id, is_active: false })
        .eq("id", deal.id);
      if (dealUpdateErr) throw new Error(`update deal with offer_id failed: ${dealUpdateErr.message}`);

      const { data: check, error: checkErr } = await supabase
        .from("daily_deals")
        .select("id,offer_id,is_active")
        .eq("id", deal.id)
        .single();
      if (checkErr) throw new Error(`deal readback failed: ${checkErr.message}`);
      if (check.offer_id !== offer.id || check.is_active !== false) {
        throw new Error("deal link/toggle values did not persist");
      }

      return `deal_id=${deal.id} linked_offer_id=${offer.id}`;
    });
  }

  // keep references to avoid lint-like unused concerns in Node runtime
  if (createdDeal && createdDealOffer && linkedProductId) {
    // no-op
  }
}

async function testBanners() {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const displayBase = Math.floor(Date.now() / 1000);
  let bannerA = null;
  let bannerB = null;
  let bannerCopy = null;

  await runCheck("banners", "Storage bucket product-images exists", async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw new Error(error.message);
    const exists = (buckets || []).some((b) => b.name === "product-images");
    if (!exists) throw new Error("bucket product-images not found");
    return "bucket found";
  });

  await runCheck("banners", "Create + edit + activate banner", async () => {
    const payload = {
      title: uid("E2E Banner A"),
      subtitle: "Banner subtitle",
      image_url: "https://placehold.co/1200x400/png",
      mobile_image_url: "https://placehold.co/600x300/png",
      link_url: "/pharmacy/products",
      link_text: "Shop Now",
      display_order: displayBase,
      is_active: true,
      start_date: start,
      end_date: end,
      banner_type: "hero",
      background_color: "#000000",
      text_color: "#FFFFFF",
      overlay_opacity: 0.3,
      target_page: "home",
    };

    const { data, error } = await supabase.from("banners").insert([payload]).select("*").single();
    if (error) throw new Error(error.message);
    bannerA = data;
    addCleanup(`Delete banner A ${data.id}`, async () => {
      await supabase.from("banners").delete().eq("id", data.id);
    });

    const { error: updErr } = await supabase
      .from("banners")
      .update({ title: `${data.title} Updated`, is_active: false })
      .eq("id", data.id);
    if (updErr) throw new Error(`update failed: ${updErr.message}`);

    const { data: read, error: readErr } = await supabase
      .from("banners")
      .select("id,title,is_active")
      .eq("id", data.id)
      .single();
    if (readErr) throw new Error(`readback failed: ${readErr.message}`);
    if (read.is_active !== false) throw new Error("banner toggle did not persist");
    return `banner_id=${data.id}`;
  });

  await runCheck("banners", "Duplicate and reorder banners", async () => {
    if (!bannerA) throw new Error("banner A missing");

    const { data: b2, error: b2Err } = await supabase
      .from("banners")
      .insert([
        {
          title: uid("E2E Banner B"),
          subtitle: "Second banner",
          image_url: "https://placehold.co/1200x400/png",
          mobile_image_url: null,
          link_url: "/pharmacy/deals",
          link_text: "View Deals",
          display_order: displayBase + 1,
          is_active: true,
          start_date: start,
          end_date: end,
          banner_type: "hero",
          background_color: "#111111",
          text_color: "#FFFFFF",
          overlay_opacity: 0.2,
          target_page: "home",
        },
      ])
      .select("*")
      .single();
    if (b2Err) throw new Error(`banner B create failed: ${b2Err.message}`);
    bannerB = b2;
    addCleanup(`Delete banner B ${b2.id}`, async () => {
      await supabase.from("banners").delete().eq("id", b2.id);
    });

    const { data: cp, error: cpErr } = await supabase
      .from("banners")
      .insert([
        {
          title: `${bannerA.title} (Copy)`,
          subtitle: bannerA.subtitle,
          image_url: bannerA.image_url,
          mobile_image_url: bannerA.mobile_image_url,
          link_url: bannerA.link_url,
          link_text: bannerA.link_text,
          display_order: (bannerA.display_order || displayBase) + 2,
          is_active: false,
          start_date: bannerA.start_date,
          end_date: bannerA.end_date,
          banner_type: bannerA.banner_type,
          background_color: bannerA.background_color,
          text_color: bannerA.text_color,
          overlay_opacity: bannerA.overlay_opacity,
          target_page: bannerA.target_page,
        },
      ])
      .select("id")
      .single();
    if (cpErr) throw new Error(`duplicate failed: ${cpErr.message}`);
    bannerCopy = cp;
    addCleanup(`Delete banner copy ${cp.id}`, async () => {
      await supabase.from("banners").delete().eq("id", cp.id);
    });

    const orderA = bannerA.display_order ?? displayBase;
    const orderB = bannerB.display_order ?? displayBase + 1;
    const { error: swap1 } = await supabase.from("banners").update({ display_order: orderB }).eq("id", bannerA.id);
    if (swap1) throw new Error(`swap step1 failed: ${swap1.message}`);
    const { error: swap2 } = await supabase.from("banners").update({ display_order: orderA }).eq("id", bannerB.id);
    if (swap2) throw new Error(`swap step2 failed: ${swap2.message}`);

    const { data: verify, error: verifyErr } = await supabase
      .from("banners")
      .select("id,display_order")
      .in("id", [bannerA.id, bannerB.id]);
    if (verifyErr) throw new Error(`verify swap failed: ${verifyErr.message}`);
    if (!verify || verify.length !== 2) throw new Error("swap verify returned incomplete rows");
    return `created banner_b=${b2.id}, banner_copy=${cp.id}`;
  });

  await runCheck("banners", "Public active-banner query contract", async () => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("banners")
      .select("id,is_active,start_date,end_date")
      .eq("is_active", true)
      .lte("start_date", nowIso)
      .gte("end_date", nowIso)
      .limit(5);
    if (error) throw new Error(error.message);
    return `active_query_rows=${data?.length || 0}`;
  });

  if (bannerCopy && bannerB) {
    // no-op
  }
}

async function testAnnouncements() {
  let ann = null;

  await runCheck("announcements", "Create announcement", async () => {
    const payload = {
      title: uid("E2E Announcement"),
      message: "Marketing E2E test announcement",
      announcement_type: "promo",
      display_type: "banner",
      target_audience: "pharmacy",
      link_url: "/pharmacy/deals",
      link_text: "Check Deals",
      is_active: true,
      is_dismissible: true,
      priority: 9,
      start_date: null,
      end_date: null,
    };
    const { data, error } = await supabase.from("announcements").insert([payload]).select("*").single();
    if (error) throw new Error(error.message);
    ann = data;
    addCleanup(`Delete announcement ${data.id}`, async () => {
      await supabase.from("announcements").delete().eq("id", data.id);
    });
    return `announcement_id=${data.id}`;
  });

  await runCheck("announcements", "Update + toggle announcement active", async () => {
    if (!ann) throw new Error("announcement missing");
    const { error: updErr } = await supabase
      .from("announcements")
      .update({ message: "Updated E2E announcement", is_active: false, priority: 11 })
      .eq("id", ann.id);
    if (updErr) throw new Error(updErr.message);

    const { data, error } = await supabase
      .from("announcements")
      .select("id,is_active,priority,message")
      .eq("id", ann.id)
      .single();
    if (error) throw new Error(error.message);
    if (data.is_active !== false || data.priority !== 11) {
      throw new Error("announcement values did not persist");
    }
    return "update persisted";
  });

  await runCheck("announcements", "Target audience filter contract", async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("id,target_audience")
      .eq("is_active", true)
      .or("target_audience.eq.all,target_audience.eq.pharmacy")
      .limit(10);
    if (error) throw new Error(error.message);
    return `audience_query_rows=${data?.length || 0}`;
  });
}

async function testBlogs() {
  let blog = null;
  const slug = uid("marketing-blog").toLowerCase();

  await runCheck("blogs", "Create blog draft", async () => {
    const payload = {
      title: uid("E2E Blog"),
      slug,
      excerpt: "E2E excerpt",
      content: "E2E content body",
      featured_image: null,
      category: "Testing",
      tags: ["e2e", "marketing"],
      author_name: "E2E Bot",
      is_published: false,
      is_featured: false,
      published_at: null,
    };
    const { data, error } = await supabase.from("blogs").insert([payload]).select("*").single();
    if (error) throw new Error(error.message);
    blog = data;
    addCleanup(`Delete blog ${data.id}`, async () => {
      await supabase.from("blogs").delete().eq("id", data.id);
    });
    return `blog_id=${data.id}`;
  });

  await runCheck("blogs", "Slug uniqueness enforced", async () => {
    const dupPayload = {
      title: uid("E2E Blog Duplicate"),
      slug,
      content: "duplicate slug check",
      is_published: false,
      is_featured: false,
    };
    const { data, error } = await supabase.from("blogs").insert([dupPayload]).select("id").maybeSingle();
    if (!error) {
      if (data?.id) {
        addCleanup(`Delete duplicate blog ${data.id}`, async () => {
          await supabase.from("blogs").delete().eq("id", data.id);
        });
      }
      throw new Error("duplicate slug insert unexpectedly succeeded");
    }
    return `duplicate blocked (${error.code || "no_code"})`;
  });

  await runCheck("blogs", "Publish + feature toggle", async () => {
    if (!blog) throw new Error("blog missing");
    const publishedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("blogs")
      .update({ is_published: true, is_featured: true, published_at: publishedAt })
      .eq("id", blog.id);
    if (updErr) throw new Error(updErr.message);

    const { data, error } = await supabase
      .from("blogs")
      .select("id,is_published,is_featured,published_at")
      .eq("id", blog.id)
      .single();
    if (error) throw new Error(error.message);
    if (!data.is_published || !data.is_featured || !data.published_at) {
      throw new Error("publish/feature flags not persisted");
    }
    return "publish + feature persisted";
  });

  await runCheck("blogs", "Public blog-list query contract", async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id,is_published,published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return `published_rows=${data?.length || 0}`;
  });
}

async function testIntegration() {
  await runCheck("integration", "Admin routes exist for all marketing pages", async () => {
    const appPath = path.resolve(process.cwd(), "src", "App.tsx");
    const content = fs.readFileSync(appPath, "utf8");
    const required = [
      "/admin/offers",
      "/admin/banners",
      "/admin/announcements",
      "/admin/blogs",
    ];
    const missing = required.filter((route) => !content.includes(route));
    if (missing.length > 0) throw new Error(`missing routes: ${missing.join(", ")}`);
    return "all routes present";
  });

  await runCheck("integration", "Admin sidebar marketing menu mapping exists", async () => {
    const navPath = path.resolve(process.cwd(), "src", "components", "DashboardLayout.tsx");
    const content = fs.readFileSync(navPath, "utf8");
    const required = [
      'label: "Offers & Promos"',
      'label: "Banners"',
      'label: "Announcements"',
      'label: "Blogs"',
    ];
    const missing = required.filter((token) => !content.includes(token));
    if (missing.length > 0) throw new Error(`missing menu labels: ${missing.join(", ")}`);
    return "menu entries present";
  });

  await runCheck("integration", "Banner slider has view tracking hook reference", async () => {
    const p = path.resolve(process.cwd(), "src", "components", "pharmacy", "components", "BannerSlider.tsx");
    const content = fs.readFileSync(p, "utf8");
    const usesTracking = content.includes("trackBannerView(");
    const definesTracking =
      content.includes("const trackBannerView") ||
      content.includes("function trackBannerView");
    if (usesTracking && !definesTracking) {
      throw new Error("trackBannerView is called but not defined in BannerSlider.tsx");
    }
    return usesTracking ? "tracking function defined" : "no tracking call detected";
  });
}

async function main() {
  console.log("\nMarketing E2E check started...");
  try {
    await testOffersPromos();
    await testBanners();
    await testAnnouncements();
    await testBlogs();
    await testIntegration();
  } finally {
    await safeCleanup();
  }

  Object.keys(state.modules).forEach((m) => setModuleScore(m));
  setOverallScore();
  state.finishedAt = new Date().toISOString();

  const outPath = path.resolve(process.cwd(), ".tmp", "e2e_marketing_sections_result.json");
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2), "utf8");

  console.log("\n=== MARKETING E2E RESULT ===");
  console.log(`Passed: ${state.totals.passed}`);
  console.log(`Failed: ${state.totals.failed}`);
  console.log(`Warnings: ${state.totals.warnings}`);
  console.log(`Overall Score: ${state.totals.score}/100`);
  console.log(`Result file: ${outPath}`);

  if (state.totals.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

