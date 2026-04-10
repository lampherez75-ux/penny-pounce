# Penny Pounce - Smart Price Comparison Extension

## 🎯 Overview
Penny Pounce is a browser extension that intelligently compares clothing prices across retailers with a sophisticated ranking algorithm.

## ✨ What's New (v2.0)

### 1. **Subscription Paywall System**
- **Lite Tier**: 5 searches/month (Free)
- **Pro Tier**: 100 searches/month ($4.99/mo)
- **Max Tier**: Unlimited searches ($9.99/mo)

Usage tracking resets monthly and persists across sessions using Chrome storage.

### 2. **Intelligent Deal Ranking Algorithm**
Results are scored based on:
- **45%** - Price (lower = better)
- **25%** - Review quality (rating)
- **20%** - Availability (in stock)
- **10%** - Seller trust (verified retailers)

### 3. **Quality Filtering**
- Only shows products with **4+ star ratings**
- Filters out low-quality or questionable deals

### 4. **Direct Product Links**
- Extracts actual product URLs (not Google Shopping pages)
- Routes directly to retailer websites
- Ready for affiliate link integration

### 5. **Rebranded Design**
- Updated to "Penny Pounce" throughout
- Modern gradient UI with purple/pink theme
- Improved UX with deal score badges
- Mobile-responsive design

## 📁 File Structure

```
/penny-pounce/
├── manifest.json          # Extension config (updated permissions)
├── popup.html            # UI with new Penny Pounce design
├── popup.js              # Logic with paywall + ranking
├── content.js            # Enhanced product detection
└── backend-example.js    # Serverless API template
```

## 🔧 Setup Instructions

### 1. Install Extension Locally
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `/penny-pounce/` folder

### 2. Configure Backend
1. Deploy `backend-example.js` to Vercel
2. Set environment variables:
   - `SERPAPI_KEY` - Your SerpAPI key
   - `AMAZON_ASSOCIATE_TAG` - Your Amazon affiliate tag
3. Update `API_URL` in `popup.js` with your Vercel URL

### 3. Test Subscription System
To test different tiers during development:
```javascript
// In browser console when extension is open:
chrome.storage.local.set({ userTier: 'PRO', searchCount: 0 });
// Then reload the extension popup
```

## 🎨 Customization

### Change Colors
Edit the CSS gradient in `popup.html`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Adjust Ranking Algorithm
Modify weights in `popup.js` → `calculateDealScore()`:
```javascript
const priceScore = ((maxPrice - price) / priceRange) * 45; // Change 45 to adjust
```

### Add More Retailers
Update `content.js` with new selectors:
```javascript
// YourStore
name = document.querySelector('.your-store-title')?.textContent?.trim();
if (name) return name;
```

## 🚀 Next Steps

### Immediate:
1. ✅ Add actual subscription payment flow (LemonSqueezy/Stripe)
2. ✅ Create upgrade landing page
3. ✅ Design icon assets (icon16.png, icon48.png, icon128.png)
4. ✅ Set up affiliate tracking

### Future Enhancements:
- Price history graphs
- Price drop alerts
- Save favorite products
- Compare across categories
- Browser notifications

## 🔐 Subscription Management

To integrate real payments:
1. Set up LemonSqueezy or Stripe account
2. Create webhook handler to update user tier
3. Store user authentication token
4. Sync tier status on extension load

Example flow:
```
User clicks "Upgrade" → Opens payment page → 
After payment → Webhook updates database → 
Extension syncs tier via API call
```

## 📊 Analytics Tracking (Optional)
Add event tracking for:
- Search attempts
- Tier upgrades
- Deal clicks
- Product detection success rate

## 🐛 Known Issues & Fixes

### Issue: "Unable to detect product"
**Fix**: Add more site-specific selectors to `content.js`

### Issue: "No results found"
**Fix**: Check if SerpAPI has results for that product category

### Issue: All deals are 100% score
**Fix**: Ensure price normalization is working in `calculateDealScore()`

## 📝 License
Proprietary - All rights reserved

## 🤝 Support
For issues or questions, contact support@pennypounce.com
