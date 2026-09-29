-- Nationwide (location_id NULL) Government of India schemes, English + Hindi.
-- Starter content so the Schemes screen isn't empty — have the client review
-- wording, and add state schemes (location_id = state) and other languages.
-- Re-runnable: skips rows whose (title, language) already exist.

BEGIN;

INSERT INTO schemes (title, description, source_url, language, last_synced_at)
SELECT v.title, v.description, v.source_url, v.language, now()
FROM (VALUES
  ('PM-KISAN', 'Income support of ₹6,000 per year, paid in three instalments directly to the bank accounts of eligible landholding farmer families.', 'https://pmkisan.gov.in', 'en'),
  ('Ayushman Bharat – PM-JAY', 'Free health cover of up to ₹5 lakh per family per year for hospital treatment at empanelled government and private hospitals.', 'https://pmjay.gov.in', 'en'),
  ('PM Awas Yojana – Gramin', 'Financial assistance to houseless rural families and those living in kutcha houses to build a pucca house.', 'https://pmayg.nic.in', 'en'),
  ('MGNREGA', 'Guarantees at least 100 days of paid wage work in a year to every rural household whose adult members volunteer for unskilled manual work.', 'https://nrega.nic.in', 'en'),
  ('PM Ujjwala Yojana', 'Free LPG connection for women from poor households, so families can cook with clean fuel.', 'https://pmuy.gov.in', 'en'),
  ('PM Fasal Bima Yojana', 'Low-premium crop insurance for farmers against crop loss from natural calamities, pests and diseases.', 'https://pmfby.gov.in', 'en'),
  ('PM Jan Dhan Yojana', 'Zero-balance bank account with a RuPay debit card and accident insurance cover.', 'https://pmjdy.gov.in', 'en'),
  ('PM Jeevan Jyoti Bima Yojana', 'Life insurance cover of ₹2 lakh for bank account holders aged 18–50, for a small yearly premium.', 'https://jansuraksha.gov.in', 'en'),
  ('PM Suraksha Bima Yojana', 'Accident insurance cover of up to ₹2 lakh for bank account holders aged 18–70, for a small yearly premium.', 'https://jansuraksha.gov.in', 'en'),
  ('Atal Pension Yojana', 'Guaranteed monthly pension of ₹1,000–₹5,000 after age 60 for workers who join between ages 18 and 40.', 'https://www.pfrda.org.in', 'en'),
  ('Sukanya Samriddhi Yojana', 'High-interest small savings account for a girl child below 10 years, for her education and marriage.', 'https://www.indiapost.gov.in', 'en'),

  ('पीएम-किसान', 'पात्र भूमिधारक किसान परिवारों को हर साल ₹6,000 की आय सहायता, तीन किस्तों में सीधे बैंक खाते में।', 'https://pmkisan.gov.in', 'hi'),
  ('आयुष्मान भारत – पीएम-जेएवाई', 'सूचीबद्ध सरकारी और निजी अस्पतालों में इलाज के लिए प्रति परिवार प्रति वर्ष ₹5 लाख तक का मुफ्त स्वास्थ्य कवर।', 'https://pmjay.gov.in', 'hi'),
  ('प्रधानमंत्री आवास योजना – ग्रामीण', 'बेघर और कच्चे घरों में रहने वाले ग्रामीण परिवारों को पक्का घर बनाने के लिए आर्थिक सहायता।', 'https://pmayg.nic.in', 'hi'),
  ('मनरेगा', 'हर ग्रामीण परिवार को साल में कम से कम 100 दिन के मजदूरी वाले काम की गारंटी।', 'https://nrega.nic.in', 'hi'),
  ('प्रधानमंत्री उज्ज्वला योजना', 'गरीब परिवारों की महिलाओं को मुफ्त एलपीजी कनेक्शन।', 'https://pmuy.gov.in', 'hi'),
  ('प्रधानमंत्री फसल बीमा योजना', 'प्राकृतिक आपदा, कीट और रोग से फसल नुकसान पर किसानों के लिए कम प्रीमियम वाला फसल बीमा।', 'https://pmfby.gov.in', 'hi'),
  ('प्रधानमंत्री जन धन योजना', 'रुपे डेबिट कार्ड और दुर्घटना बीमा के साथ शून्य बैलेंस बैंक खाता।', 'https://pmjdy.gov.in', 'hi'),
  ('प्रधानमंत्री जीवन ज्योति बीमा योजना', '18–50 वर्ष के बैंक खाताधारकों के लिए कम वार्षिक प्रीमियम पर ₹2 लाख का जीवन बीमा।', 'https://jansuraksha.gov.in', 'hi'),
  ('प्रधानमंत्री सुरक्षा बीमा योजना', '18–70 वर्ष के बैंक खाताधारकों के लिए कम वार्षिक प्रीमियम पर ₹2 लाख तक का दुर्घटना बीमा।', 'https://jansuraksha.gov.in', 'hi'),
  ('अटल पेंशन योजना', '18 से 40 वर्ष की उम्र में जुड़ने वालों को 60 वर्ष के बाद ₹1,000–₹5,000 मासिक पेंशन की गारंटी।', 'https://www.pfrda.org.in', 'hi'),
  ('सुकन्या समृद्धि योजना', '10 वर्ष से कम उम्र की बेटी के लिए अधिक ब्याज वाला बचत खाता, उसकी पढ़ाई और शादी के लिए।', 'https://www.indiapost.gov.in', 'hi')
) AS v(title, description, source_url, language)
WHERE NOT EXISTS (
  SELECT 1 FROM schemes s WHERE s.title = v.title AND s.language = v.language
);

COMMIT;
