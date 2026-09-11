## Food2Go Project Structure: 

### **<u>Business</u>** 

↓ Register ↓ Enter Business Details ↓ Upload FSSAI / Required Documents ↓ Admin Verification ↓ 

┌───────────────┐ │ │ Approved       Rejected │ │ ↓               ↓ Business       Fix Details Active 

### **<u>Customer</u>** 

↓ Register ↓ OTP Verification ↓ Login ↓ Location Permission ↓ Nearby Businesses ↓ Search / Filter ↓ View Surprise Bags ↓ Customer clicks BOOK ↓ Bag temporarily reserved 

↓ 

5-minute PAYMENT TIMER starts ↓ Customer makes payment ↓ ┌───────┴────────┐ ↓                ↓ Payment Success    Timer expires ↓                ↓ PAID              CANCELLED ↓                ↓ Pickup process    Bag available starts again 

┌──────────────────────────────┐ │ 🍱 Bakery Surprise Bag │ │ XYZ Bakery │  4.5⭐ │ │ 🟢 Vegetarian │ 🍱 Bakery │ │ ₹99 │ │ 🍱 1.2 km │ 🕐 7:00 PM – 7:30 PM │ │        [ BOOK NOW ] └──────────────────────────────┘ 

# **Modules:** 

**<u>Module 1 — Authentication & User Management</u>** 

Customer 

Registration 

OTP verification 

Login/logout Profile 

Business 

Registration Login Business profile 

Admin Admin login Role-based access 

**<u>Module 2 — Business & Surprise Bag Management</u>** 

Business 

Manage business profile 

Create Surprise Bag 

Edit Surprise Bag 

Delete/cancel Surprise Bag 

Set Food Type 

Set Food Category 

Set Food2Go Price 

Enter Original Price( x customer) 

Set packing time 

Set consume-by time 

Set pickup window 

Set quantity internally 

System 

Minimum discount validation 

Bag availability management 

Prevent invalid pricing 

Food Type 

Vegetarian Non-Vegetarian 

Food Category 

Meals Bakery Snacks Desserts 

**<u>Module 3 — Admin Verifcation & Quality Control</u>** 

Admin can: 

View businesses 

Verify business 

Verify FSSAI 

Check required documents 

Approve business 

Reject business 

Blacklist business 

Monitor quality/rating issues 

**<u>Module 4 — Search & Browse</u>** 

Customer can: 

View map 

View nearby businesses 

Search Surprise Bags Filter by Food Type Filter by Category 

Filter by price 

Filter by distance Filter by rating 

Filter by pickup time 

View Surprise Bag details 

**<u>Module 5 — Booking & Payment</u>** 

Customer: 

Select Surprise Bag 

Click Book 

Temporarily reserve bag 

Start 5-minute payment timer 

Make payment 

Receive payment confirmation 

System: 

Check availability 

Reserve bag 

Process payment 

Verify payment 

Cancel unpaid reservation automatically 

Release bag after payment timeout 

## **<u>Module 6 — Pickup & Order Management</u>** 

Customer 

View active order 

View pickup time 

View pickup countdown 

View pickup OTP 

Business 

View paid orders 

Verify pickup OTP 

Confirm collection 

System 

Mark order COLLECTED 

Automatically expire after pickup deadline 

Trigger refund when applicable 

## **<u>Module 7 — Star Rating</u>** 

Customer: 

Give 1–5 star rating after collection 

System: 

Store rating 

Calculate business average rating 

**<u>Module 8 — Favorites & Notifcations</u>** 

Favorites 

Add favorite business 

Remove favorite 

Enable/disable alerts 

Notifications 

Booking confirmation 

Payment confirmation 

Pickup reminder 

Pickup deadline reminder 

Pickup successful 

Order expired 

Refund initiated/completed 

New bag from favorite business 

**<u>Module 9 — Refund & Impact</u>** 

Refund 

Automatic expiry 

Refund calculation 

Refund request 

Refund status 

Business Impact 

Bags rescued 

Food rescued 

CO₂e reduction 

Revenue 

Profit 

Average rating 

## **Customer Functional Requirements** 

- ID Requirement 

- C1 Customer shall register using OTP verification. 

- C2 Customer shall login/logout. 

- C3 Customer shall provide location permission. 

- C4 Customer shall view nearby businesses and Surprise Bags. 

- C5 Customer shall search Surprise Bags. 

- C6 Customer shall filter by Vegetarian/Non-Vegetarian. 

- C7 Customer shall filter by food category. 

- C8 Customer shall filter by price, distance, rating and pickup time. 

- C9 Customer shall view Surprise Bag details. 

- C10 Customer shall book an available Surprise Bag. 

- C11 System shall provide a 5-minute payment window. 

- C12 Customer shall make online payment. 

- C13 Customer shall view active order and pickup countdown. 

- C14 Customer shall receive pickup OTP. 

- C15 Customer shall collect the bag using code verification. 

- C16 Customer shall receive applicable refund when the pickup expires. 

- C17 Customer shall provide a 1–5 star rating after pickup. 

- C18 Customer shall favorite businesses. 

- C19 Customer shall receive notifications. 

## **Business Functional Requirements** 

- ID Requirement 

- B1 Business shall register on Food2Go. 

- B2 Business shall submit required verification documents. 

- B3 Business shall manage its profile. 

- B4 Business shall create Surprise Bags. 

- B5 Business shall select Food Type. 

- B6 Business shall select Food Category. 

- B7 Business shall enter Original Price. 

- B8 Business shall enter Food2Go Price. 

- B9 System shall enforce minimum discount requirements. 

- B10 Business shall set pickup timing. 

- B11 Business shall enter packing and consume-by time. 

- B12 Business shall manage available bag quantity internally. 

- B13 Business shall view paid bookings. 

- B14 Business shall verify customer pickup code. 

- B15 Business shall view revenue/profit. 

- B16 Business shall view food rescue/CO impact.₂ 

- B17 Business shall view star ratings. 

## **Admin Functional Requirements** 

- ID Requirement 

- A1 Admin shall securely login. 

- A2 Admin shall view registered businesses. 

- A3 Admin shall verify business documents/FSSAI. 

- A4 Admin shall approve or reject businesses. 

- A5 Admin shall suspend/blacklist businesses. 

- A6 Admin shall monitor quality issues. 

- A7 Admin shall monitor ratings. 

- A8 Admin shall configure minimum discount policy. A9 Admin shall configure refund policy. 



<!-- Start of picture text -->
FOOD2GO<br>│<br>                       ↓<br>┌───────────────────┐<br>              Business Register │ │<br>└─────────┬─────────┘<br>                       ↓<br>                Admin Verification<br>│<br>┌──────┴──────┐<br>                ↓             ↓<br>             Approved       Rejected<br>                ↓<br>          Business Active<br>                ↓<br>        Create Surprise Bag<br>                ↓<br>             AVAILABLE<br><!-- End of picture text -->

│ │ ┌───────┴────────┐ │ │ CUSTOMER          BUSINESS │ │ Register           Manage ↓                Bags OTP Login ↓ 

Search / Map 

↓ Select Surprise Bag 

↓ BOOK 

↓ 5-Minute Payment Timer 

↓ 

┌────┴─────┐ 

↓          ↓ 

PAID      EXPIRED 

↓          ↓ 

Pickup       Cancel Timer ↓ 

Customer reaches shop? │ 

┌─┴─────────────┐ 

↓               ↓ YES              NO ↓                ↓ Pickup code       EXPIRED ↓                ↓ Verify          Refund ↓ COLLECTED ↓ Review ↓ Rating 

↓ 

CO₂ / Food Saved Statistics 

