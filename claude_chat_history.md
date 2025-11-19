What is Supabase
Shared by Lucas

This is a copy of a chat between Claude and Lucas. Content may include unverified or unsafe content that do not represent the views of Anthropic. Shared snapshot may contain attachments and data not displayed here.

whats supabase?

Supabase is an open-source Firebase alternative that provides backend-as-a-service tools for building applications. It's essentially a suite of tools that gives you a complete backend infrastructure without having to build everything from scratch.

The core components include:

Postgres Database - At its heart is a full Postgres database, which gives you a powerful relational database with all of PostgreSQL's features.

Authentication - Built-in user authentication with support for email/password, magic links, OAuth providers (Google, GitHub, etc.), and more.

Auto-generated APIs - Supabase automatically generates RESTful APIs and real-time subscriptions based on your database schema, so you can instantly query your data.

Storage - File storage for handling images, videos, and other files with access controls.

Real-time subscriptions - Listen to database changes in real-time, useful for chat apps, collaborative tools, or live dashboards.

Edge Functions - Serverless functions for custom backend logic.

It's popular with developers because it's open source (you can self-host it), has generous free tier, and provides a nice developer experience with good documentation. People often use it for web apps, mobile apps, and SaaS products where they want to move quickly without managing a lot of backend infrastructure.

Think of it as giving you the convenience of Firebase but with the power and flexibility of PostgreSQL, plus the option to self-host if you want full control.

PostgreSQL vs mongodb?

PostgreSQL and MongoDB are fundamentally different types of databases, each with their own strengths:

PostgreSQL is a relational database (SQL) - data is organized in tables with rows and columns, like a spreadsheet. You define a strict schema upfront (what columns exist, what types they are), and relationships between tables are explicit. It's been around since 1986 and is extremely mature and reliable.

MongoDB is a document database (NoSQL) - data is stored as JSON-like documents in collections. The schema is flexible, so different documents in the same collection can have different fields. It's designed to be more adaptable as your data structure evolves.

When PostgreSQL shines:

    Complex queries with multiple table joins
    Data integrity is critical (ACID transactions are rock-solid)
    Your data naturally fits a structured, relational model
    You need advanced features like full-text search, JSON support (yes, Postgres can do JSON too), window functions, or complex aggregations
    Strong consistency requirements

When MongoDB shines:

    Rapidly changing or unpredictable data structures
    Horizontally scaling across many servers
    Working with nested, hierarchical data that maps naturally to JSON
    You want to store complete objects without splitting them across tables
    High write throughput for logging or analytics

The modern reality: PostgreSQL has added so much JSON support over the years that it can handle many use cases people once chose MongoDB for. Many developers now default to Postgres because it gives you both relational and document capabilities, plus decades of optimization and tooling.

The choice often comes down to your team's expertise and specific requirements rather than one being objectively "better."

if i have a schema for mongodb, is it easy for us to migrate to supabase?

Migrating from MongoDB to Supabase (PostgreSQL) is definitely possible but not trivial - it requires some real work and planning.

The challenges:

Schema transformation - MongoDB's flexible document structure needs to be mapped to PostgreSQL's table structure. Nested objects and arrays in MongoDB need to be either flattened into separate tables with relationships, or stored as JSON/JSONB columns in Postgres.

Data mapping - You'll need to write scripts to extract data from MongoDB and transform it into a format Postgres can import. MongoDB's ObjectId becomes a UUID or similar in Postgres.

Query rewriting - All your database queries need to be rewritten from MongoDB syntax to SQL. If you're using an ORM this might be easier, but raw queries need complete rewrites.

Indexing - You'll need to recreate your indexes in a way that makes sense for PostgreSQL's query planner.

The good news:

PostgreSQL's JSONB - For complex nested data that doesn't fit neatly into tables, you can use JSONB columns in Postgres. This lets you store JSON documents similar to MongoDB and even query into them efficiently.

Supabase's tooling - Once your data is in Postgres format, Supabase makes it easy to work with - auto-generated APIs, real-time subscriptions, etc.

Practical approach:

If your MongoDB schema is relatively simple and flat, migration is easier. If you have deeply nested documents with variable structures, you'll need to decide whether to normalize into proper relational tables or lean on PostgreSQL's JSONB features.

It's not a quick "export and import" job - expect it to take meaningful development time, especially for testing that everything works correctly after migration.

whats JSONB

JSONB is PostgreSQL's binary storage format for JSON data. The "B" stands for "binary."

What it does:

It lets you store JSON documents directly in a PostgreSQL column, similar to how you'd store documents in MongoDB. So instead of splitting data across multiple tables, you can store complex nested objects in a single column.

JSONB vs regular JSON:

PostgreSQL actually has two JSON types - json and jsonb. The json type stores the exact text as you insert it, while jsonb converts it to an optimized binary format. JSONB is almost always what you want because:

    Much faster queries - You can index JSONB data and query into it efficiently
    Removes duplicate keys and insignificant whitespace - Makes storage more efficient
    Supports indexing - You can create indexes on specific fields within the JSON

Example usage:
sql

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  metadata JSONB
);

INSERT INTO users VALUES (
  gen_random_uuid(),
  'user@example.com',
  '{"preferences": {"theme": "dark"}, "tags": ["premium", "active"]}'
);

-- Query into the JSON
SELECT * FROM users 
WHERE metadata->>'preferences'->>'theme' = 'dark';

-- Or check if array contains value
SELECT * FROM users 
WHERE metadata->'tags' ? 'premium';

Why it matters for migration:

When moving from MongoDB to Postgres, you don't have to flatten everything into relational tables. For parts of your data that are truly document-like or variable, JSONB gives you MongoDB-style flexibility while keeping PostgreSQL's reliability and transaction support.

i have a meteor js app taht im trying to port to expo+supa base. here is one of my files

import { Mongo } from "meteor/mongo";
import Joi from "joi";
import { check } from "meteor/check";
/** Define a Mongo collection to hold the data. */
const Captcha = new Mongo.Collection("Captcha");
/** Define a Joi schema to specify the structure of each document in the collection. */
const CaptchaSchema = Joi.object({
_id: Joi.string().required(),
text: Joi.string().required(),
timestamp: Joi.date().required(),
solved: Joi.boolean().required(),
used: Joi.boolean().required(),
});
async function isCaptchaSolved(sessionId) {
check(sessionId, String);
// Always perform database lookup to maintain constant timing
const session = await Captcha.findOneAsync({ _id: sessionId });
// Use constant-time evaluation to prevent timing attacks
let isValid = false;
let isSolved = false;
let isUsed = true; // Default to used for security
if (session) {
isSolved = session.solved === true;
isUsed = session.used === true;
  }
// Constant-time boolean evaluation
isValid = isSolved && !isUsed;
// Add small random delay to further obfuscate timing
const delay = Math.floor(Math.random() * 5) + 1; // 1-5ms
await new Promise(resolve => {
setTimeout(resolve, delay);
  });
return isValid;
}
async function useCaptcha(sessionId) {
check(sessionId, String);
// Use atomic update to prevent race conditions
const result = await Captcha.updateAsync(
    {
_id: sessionId,
solved: true,
used: false,
    },
    {
$set: { used: true },
    },
  );
// Return whether the update was successful (captcha was available to use)
return result > 0;
}
/** Make the collection and schema available to other code. */
export { Captcha, CaptchaSchema, isCaptchaSolved, useCaptcha };

is are there supa base alterntives?

Yes! Here's how you'd implement this in Supabase. The main changes are switching from Meteor's MongoDB to Supabase's PostgreSQL with their JavaScript client.

First, create the table in Supabase:
sql

CREATE TABLE captcha (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  solved BOOLEAN NOT NULL DEFAULT FALSE,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Add an index for faster lookups
CREATE INDEX idx_captcha_solved_used ON captcha(solved, used);

Then here's the equivalent JavaScript code:
Supabase Captcha Implementation
Code 

Key differences from Meteor:

    No Mongo.Collection - Use Supabase client's .from('table_name') instead
    Async/await everywhere - Supabase client is promise-based
    Different query syntax - .eq(), .select(), .update() instead of MongoDB's syntax
    No check() function - I replaced it with simple type checking, but you could use a validation library
    Error handling - Supabase returns {data, error} objects, so check for errors explicitly
    Atomic updates still work - The WHERE clause in PostgreSQL's UPDATE is atomic, so your race condition protection is maintained

For Expo:

Install the Supabase client:
bash

npm install @supabase/supabase-js

The same code works in React Native/Expo - Supabase's JS client is cross-platform. Just make sure to store your Supabase URL and anon key in environment variables or a config file.

Would you like help setting up Row Level Security (RLS) policies for this table? That's Supabase's way of handling permissions at the database level.

are there mongodb backend for expo?

Yes, there are several ways to use MongoDB with Expo, though they're not as straightforward as Supabase:

1. MongoDB Realm (now Atlas Device SDK) This is MongoDB's official mobile solution. It provides:

    Local-first database that syncs with MongoDB Atlas
    Offline support with automatic sync when online
    Real-time data synchronization
    Built-in authentication

bash

npm install realm @realm/react

It works well with React Native/Expo, but has some limitations with Expo Go (you may need to use development builds).

2. MongoDB Atlas Data API MongoDB Atlas has a REST API you can call directly from Expo:

    No special SDK needed, just fetch requests
    Works perfectly with Expo Go
    But you're making HTTP calls for every query (latency)
    Need to handle authentication yourself

3. Build your own backend Run a Node.js server (Express, Fastify, etc.) that connects to MongoDB, then call it from Expo:

    Most control and flexibility
    Need to deploy and maintain a server
    Can use the full MongoDB driver

4. Parse Server An open-source backend that uses MongoDB and provides a complete BaaS:

    Similar to Firebase/Supabase in concept
    Can self-host or use hosted options
    Has React Native SDK

The reality: Most developers using Expo choose backends like Supabase or Firebase because they're simpler and have better mobile integration out of the box. MongoDB Realm is the closest "official" solution, but it has a learning curve and some Expo compatibility quirks.

If you're already planning to migrate away from Meteor, Supabase is honestly the smoother path for Expo. But if you really want to keep MongoDB, Realm or the Data API are your best bets.

What's making you want to stick with MongoDB - is it the existing data, or do you prefer the document model?

can i selfhost Realm?

No, you cannot self-host MongoDB Realm/Atlas Device SDK. It requires MongoDB Atlas (their cloud service) for the sync functionality and backend features.

Here's the breakdown:

What you can't self-host:

    Realm Sync - The synchronization service that syncs data between devices and the cloud only works with MongoDB Atlas (cloud-only)
    Atlas Device Services - Authentication, functions, triggers all require Atlas

What you CAN self-host:

    MongoDB database itself - You can run your own MongoDB server
    Realm local database - The on-device database works without Atlas, but you lose all sync capabilities
    Parse Server - This is a self-hostable alternative that uses MongoDB

Self-hosting alternatives if you want MongoDB:

Parse Server is probably your best bet:

    Open source and fully self-hostable
    Uses MongoDB as its database
    Provides authentication, APIs, push notifications
    Has React Native SDK
    Active community

bash

# Parse Server with MongoDB
npm install parse-server mongodb-runner

Or build your own:

    Self-host MongoDB
    Build a Node.js/Express API
    Use Apollo GraphQL or REST
    Call it from Expo with fetch/axios

The honest take:

If self-hosting is important to you, Supabase is actually a better choice than Realm because:

    Supabase is fully open source and self-hostable
    You get the full BaaS experience (auth, storage, APIs) on your own infrastructure
    MongoDB Realm locks you into Atlas (MongoDB's cloud)

So ironically, if you want to avoid vendor lock-in and self-host, you'd be better off migrating to Supabase (PostgreSQL) than trying to stick with MongoDB via Realm.

Does self-hosting matter for your use case, or would Atlas be acceptable?

heres my api files. can these be ported to a custom node server as http or websocket service?

Yes, these can definitely be ported to a custom Node.js server! You'd need to replace Meteor's specific features with standard Node.js equivalents. Here's how to approach it:

Main Meteor features to replace:

    Meteor.methods → Express/Fastify REST endpoints or GraphQL mutations
    Meteor.publish/subscribe → WebSocket subscriptions (Socket.io or native WebSockets)
    Mongo.Collection → MongoDB driver directly
    Meteor.userId() → JWT authentication middleware
    DDP (Meteor's protocol) → REST + WebSockets

Recommended architecture for Expo + Supabase migration:

Since you're moving to Supabase, I'd actually suggest a hybrid approach:

Option 1: Supabase-native (Simplest)

    Use Supabase's built-in features:
        Auth → supabase.auth (replaces all Accounts methods)
        Database → Row Level Security policies (replaces publications)
        Edge Functions → Deno functions for complex business logic
        Realtime → Built-in subscriptions (replaces Meteor.publish)

This would be much simpler than building a custom Node server.

Option 2: Custom Node Server (More control) If you need custom logic that Supabase can't handle:
Meteor to Node.js Server Migration Example
Code 

ok, how do i manage auth?
Drafting artifact...
 

whats Supabase-native?

Supabase-native means using Supabase's built-in features directly instead of building your own custom server. Let me explain:
What is Supabase?

Supabase is a Backend-as-a-Service (BaaS) - similar to what Meteor provided, but more modern and designed for apps like yours. Think of it as "Firebase alternative but with PostgreSQL."
Supabase-Native Features (Replaces your Meteor backend):

1. Authentication (Built-in)
javascript

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

2. Database Queries (No custom API needed)
javascript

// Instead of Meteor.call('rides.getUserRides')
// Just query directly:
const { data: rides } = await supabase
  .from('rides')
  .select('*')
  .or(`driver.eq.${userId},riders.cs.{${userId}}`);

// Insert
const { data } = await supabase
  .from('rides')
  .insert({ driver: userId, seats: 4, date: '2024-01-01' });

3. Real-time Subscriptions (Replaces Meteor.publish)
javascript

// Listen to changes in real-time
const subscription = supabase
  .channel('rides-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'rides'
  }, (payload) => {
    console.log('New ride!', payload.new);
  })
  .subscribe();

4. Row Level Security (RLS) - The Magic Part Instead of writing Meteor publications to filter data, you set database policies:
sql

-- Users can only see rides they're part of
CREATE POLICY "Users see own rides"
ON rides FOR SELECT
USING (
  auth.uid() = driver 
  OR 
  auth.uid() = ANY(riders)
);

-- Users can only create rides as themselves
CREATE POLICY "Users create own rides"
ON rides FOR INSERT
WITH CHECK (auth.uid() = driver);

Now when you query supabase.from('rides').select('*'), users automatically only see rides they have access to - no server-side code needed!

5. Edge Functions (For complex logic) When you need custom server logic (like your captcha verification), use Supabase Edge Functions:
typescript

// supabase/functions/verify-captcha/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const { sessionId, userInput } = await req.json()
  
  // Your captcha logic here
  
  return new Response(JSON.stringify({ success: true }))
})

Why Supabase-Native is Better for Your Use Case:

Instead of building:

    ❌ Custom Express server
    ❌ JWT authentication
    ❌ WebSocket server for real-time
    ❌ API endpoints for every operation
    ❌ Authorization middleware

You get:

    ✅ Auth built-in (email, OAuth, magic links)
    ✅ Database queries from client (securely!)
    ✅ Real-time updates built-in
    ✅ Row-level security handles permissions
    ✅ Works perfectly with Expo/React Native

Migration Path from Meteor:

Meteor Concept	Supabase-Native
Meteor.methods	Direct database queries + Edge Functions
Meteor.publish/subscribe	Direct queries with RLS + Real-time subscriptions
Meteor.users	supabase.auth + users table
Meteor.userId()	supabase.auth.getUser()
MongoDB collections	PostgreSQL tables
check() validation	Joi/Zod + Database constraints

When You'd Need a Custom Server:

    Complex business logic that can't be in Edge Functions
    Integration with third-party APIs that need secrets
    Heavy computations
    Advanced scheduling/cron jobs

But for 90% of your app (CRUD, auth, real-time), Supabase-native handles it better and with less code.

Would you like me to show you how to migrate a specific feature (like your rides system or auth) to Supabase-native?

can these be implemnted in expo? how does expo client talk to supabase server?

Yes, these can absolutely be implemented in Expo! Let me explain how Expo talks to Supabase and show you the migration:
How Expo ↔ Supabase Communication Works

Direct Database Access (No custom server needed!):
javascript

// In your Expo app - talks directly to Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key' // Safe to expose in client
);

// Query rides - RLS handles security automatically
const { data: rides } = await supabase
  .from('rides')
  .select('*')
  .or(`driver.eq.${userId},riders.cs.{${userId}}`);

The magic: Supabase's Row Level Security (RLS) handles all authorization at the database level, so your Expo app talks directly to the database securely.
Component Migration Examples
Expo + Supabase Component Examples
Code ∙ Version 2 

