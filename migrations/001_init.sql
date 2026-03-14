CREATE TABLE auctions (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
CREATE TABLE hidden (auction_id INTEGER, lot_number TEXT, PRIMARY KEY (auction_id, lot_number));
CREATE TABLE favorites (auction_id INTEGER, lot_number TEXT, PRIMARY KEY (auction_id, lot_number));
CREATE TABLE history (id INTEGER PRIMARY KEY AUTOINCREMENT, auction_id INTEGER, timestamp TEXT, data TEXT);
CREATE TABLE cached_lots (auction_id INTEGER PRIMARY KEY, fetched_at TEXT, data TEXT);
CREATE TABLE bidder_lots (auction_id INTEGER, lot_id INTEGER, high_bid REAL DEFAULT 0, max_bid REAL DEFAULT 0, bid_count INTEGER DEFAULT 0, usernames TEXT DEFAULT '[]', v INTEGER DEFAULT 0, PRIMARY KEY (auction_id, lot_id));
CREATE TABLE bidder_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, auction_id INTEGER, username TEXT, timestamp TEXT);
CREATE TABLE bidder_meta (auction_id INTEGER PRIMARY KEY, max_active_bidders INTEGER DEFAULT 0);
