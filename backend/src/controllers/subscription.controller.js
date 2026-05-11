const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const Subscription = require('../models/Subscription.model');

const isDbConnected = () => mongoose.connection.readyState === 1;

// ── Known subscription keywords ────────────────────────────────────────────────

const MERCHANT_PATTERNS = [
  // Streaming
  { pattern: /netflix/i,   name: 'Netflix',   category: 'streaming' },
  { pattern: /spotify/i,   name: 'Spotify',   category: 'streaming' },
  { pattern: /hotstar|disney/i, name: 'Disney+ Hotstar', category: 'streaming' },
  { pattern: /prime\s*video|amazon\s*prime/i, name: 'Amazon Prime', category: 'streaming' },
  { pattern: /youtube\s*premium/i, name: 'YouTube Premium', category: 'streaming' },
  { pattern: /zee5/i,      name: 'ZEE5',      category: 'streaming' },
  { pattern: /sonyliv/i,   name: 'SonyLIV',   category: 'streaming' },
  { pattern: /apple\s*tv/i, name: 'Apple TV+', category: 'streaming' },

  // SaaS / Design / Dev Tools
  { pattern: /adobe/i,     name: 'Adobe',     category: 'saas' },
  { pattern: /figma/i,     name: 'Figma',     category: 'saas' },
  { pattern: /notion/i,    name: 'Notion',    category: 'saas' },
  { pattern: /slack/i,     name: 'Slack',     category: 'saas' },
  { pattern: /github/i,    name: 'GitHub',    category: 'saas' },
  { pattern: /linear/i,    name: 'Linear',    category: 'saas' },
  { pattern: /canva/i,     name: 'Canva',     category: 'saas' },
  { pattern: /grammarly/i, name: 'Grammarly', category: 'saas' },
  { pattern: /zoom/i,      name: 'Zoom',      category: 'saas' },
  { pattern: /loom/i,      name: 'Loom',      category: 'saas' },
  { pattern: /framer/i,    name: 'Framer',    category: 'saas' },
  { pattern: /webflow/i,   name: 'Webflow',   category: 'saas' },
  { pattern: /1password/i, name: '1Password', category: 'saas' },
  { pattern: /lastpass/i,  name: 'LastPass',  category: 'saas' },

  // Cloud
  { pattern: /aws|amazon\s*web/i, name: 'AWS',          category: 'cloud' },
  { pattern: /google\s*cloud|gcp/i, name: 'Google Cloud', category: 'cloud' },
  { pattern: /azure/i,     name: 'Microsoft Azure', category: 'cloud' },
  { pattern: /digitalocean/i, name: 'DigitalOcean', category: 'cloud' },
  { pattern: /vercel/i,    name: 'Vercel',    category: 'cloud' },
  { pattern: /netlify/i,   name: 'Netlify',   category: 'cloud' },
  { pattern: /cloudflare/i, name: 'Cloudflare', category: 'cloud' },

  // Google Workspace
  { pattern: /google\s*(workspace|one|drive|play)/i, name: 'Google Workspace', category: 'saas' },

  // Email Marketing
  { pattern: /mailchimp/i, name: 'Mailchimp', category: 'saas' },
  { pattern: /convertkit/i, name: 'ConvertKit', category: 'saas' },

  // Fitness
  { pattern: /cult\.fit|curefit/i, name: 'Cult.fit', category: 'fitness' },
  { pattern: /gym|fitness/i, name: 'Gym Membership', category: 'fitness' },

  // Insurance
  { pattern: /insurance|insur|policy/i, name: 'Insurance', category: 'insurance' },
  { pattern: /lic\b/i,     name: 'LIC',       category: 'insurance' },

  // Utilities / Rent
  { pattern: /electricity|bescom|msedcl|tata\s*power/i, name: 'Electricity', category: 'utilities' },
  { pattern: /broadband|internet|jio\s*fiber|airtel\s*fiber/i, name: 'Internet', category: 'utilities' },
  { pattern: /mobile\s*recharge|airtel|jio\s*postpaid/i, name: 'Mobile Recharge', category: 'utilities' },
  { pattern: /rent|landlord|pg\s*rent/i, name: 'Rent', category: 'rent' },

  // EMI / Loans
  { pattern: /emi|loan\s*emi|hdfc\s*bank|icici\s*bank|kotak|axis\s*bank/i, name: 'EMI Payment', category: 'emi' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
}

function matchMerchant(description) {
  for (const { pattern, name, category } of MERCHANT_PATTERNS) {
    if (pattern.test(description)) return { name, category };
  }
  return null;
}

function detectFrequency(dates) {
  if (dates.length < 2) return 'irregular';
  const sorted = [...dates].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24)); // days
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (avgGap <= 9) return 'weekly';
  if (avgGap <= 20) return 'biweekly';
  if (avgGap <= 45) return 'monthly';
  if (avgGap <= 100) return 'quarterly';
  if (avgGap <= 400) return 'annual';
  return 'irregular';
}

function predictNextDate(lastDate, frequency) {
  const d = new Date(lastDate);
  switch (frequency) {
    case 'weekly':    d.setDate(d.getDate() + 7);   break;
    case 'biweekly':  d.setDate(d.getDate() + 14);  break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break;
    default:          d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

function yearlyCost(amount, frequency) {
  const multiplier = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, annual: 1, irregular: 12 };
  return amount * (multiplier[frequency] || 12);
}

function confidenceScore(occurrences, frequency, isKnownMerchant) {
  let score = 0;
  if (isKnownMerchant) score += 0.40;
  if (occurrences >= 3) score += 0.35;
  else if (occurrences === 2) score += 0.20;
  else score += 0.05;
  if (frequency !== 'irregular') score += 0.25;
  return Math.min(1, parseFloat(score.toFixed(2)));
}

// ── POST /api/subscriptions/detect ─────────────────────────────────────────────

const detectSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (!isDbConnected()) {
      return res.status(503).json({ message: 'Database not connected.' });
    }

    // Fetch last 13 months of expense transactions
    const since = new Date();
    since.setMonth(since.getMonth() - 13);

    const txs = await Transaction.find({
      userId: new mongoose.Types.ObjectId(String(userId)),
      type: { $in: ['expense', 'transfer'] },
      date: { $gte: since },
    }).sort({ date: 1 });

    if (!txs.length) {
      return res.json({ detected: 0, subscriptions: [] });
    }

    // Group by normalized description + amount bucket (±5%)
    const groups = {};
    for (const tx of txs) {
      const merchant = matchMerchant(tx.description);
      const key = merchant ? normalize(merchant.name) : normalize(tx.description);
      if (!key || key.length < 3) continue;

      const amount = Math.abs(tx.amount);
      if (amount < 50) continue; // ignore tiny transactions

      // Find an existing group with similar amount (±10%)
      let matched = null;
      for (const gKey of Object.keys(groups)) {
        if (!gKey.startsWith(key)) continue;
        const g = groups[gKey];
        const diff = Math.abs(g.baseAmount - amount) / g.baseAmount;
        if (diff <= 0.10) { matched = gKey; break; }
      }

      if (!matched) {
        const gKey = `${key}_${Math.round(amount)}`;
        groups[gKey] = {
          key: gKey,
          merchantInfo: merchant,
          description: tx.description,
          baseAmount: amount,
          amounts: [],
          dates: [],
        };
        matched = gKey;
      }

      groups[matched].amounts.push(amount);
      groups[matched].dates.push(new Date(tx.date));
    }

    // Filter: must appear at least twice
    const recurring = Object.values(groups).filter((g) => g.dates.length >= 2);

    const upserted = [];
    for (const g of recurring) {
      const frequency = detectFrequency(g.dates);
      const lastDate = g.dates[g.dates.length - 1];
      const firstDate = g.dates[0];
      const avgAmount = g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length;
      const nextBillingDate = predictNextDate(lastDate, frequency);
      const isKnown = !!g.merchantInfo;
      const conf = confidenceScore(g.dates.length, frequency, isKnown);

      // Skip very low confidence & non-regular patterns with only 2 hits
      if (conf < 0.2) continue;

      const displayName = g.merchantInfo?.name || g.description?.substring(0, 40) || g.key;
      const category = g.merchantInfo?.category || 'other';
      const normName = normalize(displayName);

      const prevDoc = await Subscription.findOne({ userId, normalizedName: normName });

      const payload = {
        userId,
        merchantName: displayName,
        normalizedName: normName,
        amount: Math.round(avgAmount * 100) / 100,
        frequency,
        category,
        firstDetectedDate: firstDate,
        lastDetectedDate: lastDate,
        nextBillingDate,
        active: true,
        autoPredicted: true,
        yearlyCost: Math.round(yearlyCost(avgAmount, frequency) * 100) / 100,
        occurrenceCount: g.dates.length,
        confidenceScore: conf,
        priceIncreased: prevDoc ? Math.abs(prevDoc.amount - avgAmount) > prevDoc.amount * 0.05 : false,
        previousAmount: prevDoc?.amount ?? null,
      };

      const doc = await Subscription.findOneAndUpdate(
        { userId, normalizedName: normName },
        { $set: payload },
        { upsert: true, returnDocument: 'after' }
      );
      upserted.push(doc);
    }

    res.json({ detected: upserted.length, subscriptions: upserted });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/subscriptions ──────────────────────────────────────────────────────

const getSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const subs = await Subscription.find({ userId, active: true }).sort({ amount: -1 });

    const totalMonthly = subs
      .filter((s) => s.frequency === 'monthly')
      .reduce((sum, s) => sum + s.amount, 0);
    const totalYearly = subs.reduce((sum, s) => sum + s.yearlyCost, 0);

    const upcoming = subs
      .filter((s) => s.nextBillingDate)
      .filter((s) => {
        const days = (new Date(s.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 7;
      })
      .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

    res.json({ subscriptions: subs, totalMonthly, totalYearly, upcomingCount: upcoming.length, upcoming });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/subscriptions/upcoming ────────────────────────────────────────────

const getUpcoming = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const days = parseInt(req.query.days) || 30;
    const until = new Date();
    until.setDate(until.getDate() + days);

    const subs = await Subscription.find({
      userId,
      active: true,
      nextBillingDate: { $gte: new Date(), $lte: until },
    }).sort({ nextBillingDate: 1 });

    res.json({ upcoming: subs, total: subs.reduce((s, sub) => s + sub.amount, 0) });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/subscriptions/:id ──────────────────────────────────────────────

const deleteSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    await Subscription.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { active: false } }
    );
    res.json({ message: 'Subscription removed.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { detectSubscriptions, getSubscriptions, getUpcoming, deleteSubscription };
