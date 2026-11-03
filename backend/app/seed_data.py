"""Original demo kontent: IELTS uslubidagi testlar, lug'at va o'yin savollari.
Barcha matnlar ushbu loyiha uchun yangidan yozilgan (rasmiy IELTS materiallari emas)."""

# =====================================================================================  LISTENING
LISTENING_1 = {
    "title": "Listening Practice 1: Riverside Sports Centre & Botanic Garden",
    "skill": "listening", "exam_type": "academic", "duration_min": 25, "difficulty": "easy", "is_premium": False,
    "description": "Section 1 (telefon suhbati) va Section 2 (gid nutqi). 20 ta savol.",
    "content": {"sections": [
        {"title": "Section 1 — Joining a sports centre",
         "instructions": "Questions 1–10. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
         "audio_script": (
             "Receptionist: Good morning, Riverside Sports Centre. How can I help you? "
             "Caller: Hi, I'd like to become a member. Could you tell me about the options? "
             "Receptionist: Of course. We have two types: the standard membership is 32 pounds a month, and the premium one is 45. "
             "Caller: I think standard is fine. "
             "Receptionist: Great, let me take your details. What's your full name? "
             "Caller: It's Daniel Morton. That's M-O-R-T-O-N. "
             "Receptionist: And your address? "
             "Caller: 14 Hillcrest Road, in the Westbury area. "
             "Receptionist: Lovely. And a contact phone number? "
             "Caller: Yes, it's 07958 331 260. "
             "Receptionist: What activities are you most interested in? "
             "Caller: Mainly swimming, but I'd also like to try the yoga classes. "
             "Receptionist: Yoga runs on Tuesday and Thursday evenings at seven. "
             "Caller: Perfect. Do I need to bring anything for my first visit? "
             "Receptionist: Just a photo for your membership card and some form of identification, like a passport. "
             "Caller: And is there parking? "
             "Receptionist: Yes, parking is free for members, but you need to show your card at the barrier. "
             "Caller: When can I start? "
             "Receptionist: Your membership will begin on the 3rd of March. "
             "Caller: Wonderful, thanks very much.")},
        {"title": "Section 2 — A tour of the City Botanic Garden",
         "instructions": "Questions 11–15: choose the correct letter A, B or C. Questions 16–20: complete the notes, ONE WORD ONLY.",
         "audio_script": (
             "Welcome, everyone, to the City Botanic Garden. My name is Laura and I'll be your guide this morning. "
             "The garden was originally founded in 1872 by a group of local doctors who wanted to grow medicinal plants. "
             "Today it covers twelve hectares and is managed by a charity rather than the city council. "
             "Our tour will last about ninety minutes, and we'll finish at the café near the main gate. "
             "The most popular area with visitors is the glasshouse, where we grow tropical plants, especially orchids. "
             "Please note that photography is allowed everywhere, but you mustn't use a flash inside the glasshouse, because it disturbs the butterflies. "
             "Now, a few practical points. The toilets are located behind the gift shop. "
             "If you get lost, look for the tall clock tower in the centre; it's the best meeting point. "
             "On Sundays we run free workshops for children about seeds and soil. "
             "And finally, we rely heavily on volunteers, so if you're interested, please speak to the staff at the information desk.")},
    ]},
    "questions": [
        (0, "gap_fill", "Type of membership chosen: ________", [], ["standard"], 2),
        (0, "gap_fill", "Cost per month: £________", [], ["32", "thirty two", "thirty-two"], 2),
        (0, "gap_fill", "Surname: ________", [], ["Morton"], 2),
        (0, "gap_fill", "Address: 14 ________ Road, Westbury", [], ["Hillcrest"], 2),
        (0, "gap_fill", "Main activity: ________", [], ["swimming"], 2),
        (0, "gap_fill", "Yoga classes: Tuesday and ________ evenings", [], ["Thursday"], 2),
        (0, "gap_fill", "Yoga start time: ________ pm", [], ["7", "seven", "7 pm", "7pm"], 2),
        (0, "gap_fill", "Bring a photo and some ________ (e.g. a passport)", [], ["identification", "ID", "form of identification"], 2),
        (0, "gap_fill", "Parking: free, but show your ________", [], ["card", "membership card"], 2),
        (0, "gap_fill", "Membership starts on: ________ March", [], ["3rd", "3", "third", "the 3rd"], 2),
        (1, "mcq", "The garden was first created by", ["A. the city council", "B. local doctors", "C. a charity"], ["B"], None),
        (1, "mcq", "Today the garden is managed by", ["A. the city council", "B. a university", "C. a charity"], ["C"], None),
        (1, "mcq", "The tour will finish", ["A. at the café", "B. at the glasshouse", "C. at the gift shop"], ["A"], None),
        (1, "mcq", "Inside the glasshouse visitors must not", ["A. take photographs", "B. use a flash", "C. touch the orchids"], ["B"], None),
        (1, "mcq", "The tropical plants grown most are", ["A. palms", "B. cacti", "C. orchids"], ["C"], None),
        (1, "gap_fill", "Toilets: behind the gift ________", [], ["shop"], 1),
        (1, "gap_fill", "Meeting point: the clock ________", [], ["tower"], 1),
        (1, "gap_fill", "Children's workshops take place on ________", [], ["Sundays", "Sunday"], 1),
        (1, "gap_fill", "Workshops are about seeds and ________", [], ["soil"], 1),
        (1, "gap_fill", "To become a volunteer, speak to staff at the information ________", [], ["desk"], 1),
    ],
}

LISTENING_2 = {
    "title": "Listening Practice 2: Research Project & Sleep Science Lecture",
    "skill": "listening", "exam_type": "academic", "duration_min": 25, "difficulty": "hard", "is_premium": True,
    "description": "Section 3 (talabalar muhokamasi) va Section 4 (akademik ma'ruza). Premium.",
    "content": {"sections": [
        {"title": "Section 3 — Planning a group project",
         "instructions": "Questions 1–10. Choose the correct letter or write ONE WORD ONLY.",
         "audio_script": (
             "Tutor: So, Maya and Josh, how is the project on urban cycling going? "
             "Maya: Quite well. We decided to focus on why people in our city don't cycle to work. "
             "Josh: Our first idea was an online survey, but we realised the response rate would be low, so we're doing face-to-face interviews instead. "
             "Tutor: Sensible. How many people will you interview? "
             "Maya: Around forty, mostly office workers. "
             "Tutor: And what have you found so far? "
             "Josh: Surprisingly, safety isn't the main concern. Most people say the biggest problem is the lack of showers at work. "
             "Maya: Weather came second, which we expected. "
             "Tutor: How will you present the results? "
             "Josh: We'll use a bar chart for the main reasons and a map to show the routes people would take. "
             "Tutor: Good. Remember the deadline is the twentieth of May, and the report should be about three thousand words. "
             "Maya: Could we include photos? "
             "Tutor: Yes, but put them in an appendix rather than the main text.")},
        {"title": "Section 4 — Lecture: Why we sleep",
         "instructions": "Questions 11–20. Complete the notes. Write ONE WORD ONLY.",
         "audio_script": (
             "Today's lecture looks at the science of sleep. For a long time, researchers believed sleep was simply a period of rest for the body. "
             "However, we now know the brain is extremely active at night. One key function is memory: during deep sleep, the brain transfers "
             "information from short-term to long-term storage. Another function is cleaning. A system of fluid washes away waste products "
             "that build up during the day. Interestingly, teenagers naturally fall asleep later than adults because of a delay in the release of "
             "melatonin, the hormone that controls sleep. This is why some schools have experimented with later start times, and the results show "
             "better attendance. Lack of sleep has serious consequences: it weakens the immune system and increases the risk of accidents. "
             "Finally, the most common advice is to avoid screens before bed, because blue light reduces melatonin, and to keep the bedroom cool.")},
    ]},
    "questions": [
        (0, "mcq", "The students changed their research method because", ["A. surveys are expensive", "B. the response rate would be low", "C. the tutor advised it"], ["B"], None),
        (0, "gap_fill", "Number of people to interview: ________", [], ["40", "forty"], 1),
        (0, "gap_fill", "Main group interviewed: office ________", [], ["workers"], 1),
        (0, "mcq", "The biggest problem people mentioned was", ["A. safety", "B. bad weather", "C. no showers at work"], ["C"], None),
        (0, "gap_fill", "The second most common reason: ________", [], ["weather"], 1),
        (0, "gap_fill", "Main reasons shown in a bar ________", [], ["chart"], 1),
        (0, "gap_fill", "Routes shown on a ________", [], ["map"], 1),
        (0, "gap_fill", "Deadline: ________ May", [], ["20th", "20", "twentieth"], 1),
        (0, "gap_fill", "Report length: about three ________ words", [], ["thousand"], 1),
        (0, "gap_fill", "Photos should go in an ________", [], ["appendix"], 1),
        (1, "gap_fill", "Old belief: sleep was only rest for the ________", [], ["body"], 1),
        (1, "gap_fill", "Deep sleep moves information into long-term ________", [], ["storage", "memory"], 1),
        (1, "gap_fill", "A fluid system removes ________ products", [], ["waste"], 1),
        (1, "gap_fill", "Teenagers sleep later due to delayed release of ________", [], ["melatonin"], 1),
        (1, "gap_fill", "Melatonin is a ________ that controls sleep", [], ["hormone"], 1),
        (1, "gap_fill", "Later school start times improved ________", [], ["attendance"], 1),
        (1, "gap_fill", "Poor sleep weakens the ________ system", [], ["immune"], 1),
        (1, "gap_fill", "Poor sleep increases the risk of ________", [], ["accidents"], 1),
        (1, "gap_fill", "Avoid ________ before bed", [], ["screens"], 1),
        (1, "gap_fill", "Keep the bedroom ________", [], ["cool"], 1),
    ],
}

# =====================================================================================  READING
READING_1_TEXT = """A  Walk down almost any city street and you will pass dozens of trees without a second thought. Yet urban trees are among the most hard-working pieces of public infrastructure. Researchers now estimate that a single mature street tree can provide services worth several hundred dollars a year, from cleaning the air to reducing energy bills.

B  The most obvious benefit is temperature control. Cities absorb and store heat in concrete and asphalt, creating what scientists call the 'urban heat island' effect. On a summer afternoon, a tree-lined street can be up to eight degrees cooler than a treeless one nearby. This is partly due to shade, but also to a process called transpiration, in which trees release water vapour through their leaves, cooling the surrounding air much like sweat cools the human body.

C  Trees also play an important role in managing water. During heavy storms, rainwater runs quickly off hard surfaces and can overwhelm drainage systems, leading to flooding. Tree canopies intercept a surprising amount of rain, and their roots help water soak into the soil. Some cities, such as Melbourne, now plan their tree planting specifically to reduce the pressure on storm drains.

D  The effect on human health may be even more significant. Several studies have linked access to green spaces with lower levels of stress and anxiety. In one well-known experiment, hospital patients whose windows overlooked trees recovered from surgery faster and needed fewer painkillers than those who looked out onto a brick wall. However, researchers caution that such findings show a connection rather than a definite cause.

E  Despite these advantages, urban trees face a difficult life. Their roots are often trapped in small pits surrounded by pavement, they are exposed to pollution and salt from winter roads, and they are frequently damaged by vehicles. As a result, the average street tree lives far shorter than the same species growing in a forest. Choosing the right species for each location is therefore essential.

F  Money is another obstacle. Planting a tree is relatively cheap, but caring for it over decades is not. Many local governments plant thousands of young trees for publicity but fail to budget for watering and pruning, and a large proportion die within the first few years. Experts argue that maintenance funding should be guaranteed before any planting campaign begins.

G  New technology is helping. Some cities have created online maps where every public tree is recorded, and residents can report problems or even 'adopt' a tree and agree to water it. In addition to improving survival rates, these schemes appear to give communities a stronger sense of ownership over their neighbourhoods."""

READING_1 = {
    "title": "Reading Practice 1: The Hidden Life of Urban Trees",
    "skill": "reading", "exam_type": "academic", "duration_min": 25, "difficulty": "medium", "is_premium": False,
    "description": "Academic passage: matching headings, True/False/Not Given, multiple choice, summary completion.",
    "content": {"sections": [{"title": "The Hidden Life of Urban Trees", "text": READING_1_TEXT,
                              "instructions": "Read the passage and answer Questions 1–17."}]},
    "questions": [
        (0, "matching_headings", "Paragraph B", "HEADINGS", ["iii"], None),
        (0, "matching_headings", "Paragraph C", "HEADINGS", ["v"], None),
        (0, "matching_headings", "Paragraph D", "HEADINGS", ["i"], None),
        (0, "matching_headings", "Paragraph E", "HEADINGS", ["vii"], None),
        (0, "matching_headings", "Paragraph F", "HEADINGS", ["ii"], None),
        (0, "tfng", "A tree-lined street can be several degrees cooler than a nearby street without trees.", ["TRUE", "FALSE", "NOT GIVEN"], ["TRUE"], None),
        (0, "tfng", "Transpiration cools the air mainly by producing shade.", ["TRUE", "FALSE", "NOT GIVEN"], ["FALSE"], None),
        (0, "tfng", "Melbourne has the largest number of street trees in the world.", ["TRUE", "FALSE", "NOT GIVEN"], ["NOT GIVEN"], None),
        (0, "tfng", "The hospital study proved that trees directly cause faster recovery.", ["TRUE", "FALSE", "NOT GIVEN"], ["FALSE"], None),
        (0, "tfng", "Street trees usually live longer than the same species in forests.", ["TRUE", "FALSE", "NOT GIVEN"], ["FALSE"], None),
        (0, "mcq", "According to paragraph F, many young trees die because", ["A. the wrong species are chosen", "B. there is no money for long-term care", "C. residents damage them", "D. they are planted in winter"], ["B"], None),
        (0, "mcq", "What is one benefit of online tree maps mentioned in paragraph G?", ["A. They reduce planting costs", "B. They replace professional gardeners", "C. They increase community ownership", "D. They predict storms"], ["C"], None),
        (0, "mcq", "The writer's main purpose is to", ["A. criticise city governments", "B. explain the value and challenges of urban trees", "C. compare different tree species", "D. describe a hospital experiment"], ["B"], None),
        (0, "gap_fill", "Summary: Hard surfaces cause rain to run off quickly, which can lead to ________.", [], ["flooding"], 1),
        (0, "gap_fill", "Tree roots help water soak into the ________.", [], ["soil"], 1),
        (0, "gap_fill", "Street trees are often damaged by pollution, salt and ________.", [], ["vehicles"], 1),
        (0, "gap_fill", "Experts say ________ funding must be guaranteed before planting.", [], ["maintenance"], 1),
    ],
    "headings": ["i. Evidence of benefits for wellbeing", "ii. The hidden cost of looking after trees",
                 "iii. Keeping cities cool", "iv. A history of tree planting", "v. Trees and the control of rainwater",
                 "vi. Why some species are more popular", "vii. A hostile environment for growth"],
}

READING_2_TEXT = """A  As the global population heads towards ten billion, scientists and entrepreneurs are searching for new ways to grow food without using more land. One of the most talked-about ideas is vertical farming: growing crops indoors in stacked layers, often in converted warehouses or even shipping containers, under carefully controlled light, temperature and humidity.

B  Supporters point to impressive numbers. Because plants are grown in closed systems that recycle water, vertical farms can use up to 95 per cent less water than traditional fields. They need no pesticides, since insects cannot easily get inside, and crops can be harvested all year round regardless of the weather. Locating farms inside cities also means food travels a much shorter distance to consumers.

C  The biggest challenge is energy. In a field, sunlight is free; indoors, every photon must be produced by LED lamps. Electricity can account for a quarter or more of a vertical farm's operating costs, and if that electricity comes from fossil fuels, the environmental benefits are significantly reduced. Several well-funded companies have closed in recent years, largely because rising energy prices made their business unprofitable.

D  For this reason, vertical farms currently focus on a narrow range of crops. Leafy greens such as lettuce, herbs and microgreens grow quickly, are light, and sell at high prices, which makes them ideal. Staple crops like wheat, rice and potatoes, which provide most of the world's calories, remain far too expensive to grow indoors.

E  Researchers are now trying to reduce costs. Some are developing more efficient lighting that delivers only the wavelengths plants actually use. Others are using artificial intelligence to adjust conditions automatically, or breeding plant varieties that grow well in compact spaces. Many experts believe vertical farming will never replace traditional agriculture, but it could become a valuable part of urban food systems."""

READING_2 = {
    "title": "Reading Practice 2: The Promise of Vertical Farming",
    "skill": "reading", "exam_type": "academic", "duration_min": 20, "difficulty": "medium", "is_premium": True,
    "description": "Academic passage, Yes/No/Not Given va boshqa savol turlari. Premium.",
    "content": {"sections": [{"title": "The Promise of Vertical Farming", "text": READING_2_TEXT,
                              "instructions": "Read the passage and answer Questions 1–12."}]},
    "questions": [
        (0, "matching_headings", "Paragraph B", "HEADINGS", ["ii"], None),
        (0, "matching_headings", "Paragraph C", "HEADINGS", ["iv"], None),
        (0, "matching_headings", "Paragraph D", "HEADINGS", ["i"], None),
        (0, "matching_headings", "Paragraph E", "HEADINGS", ["v"], None),
        (0, "tfng", "Vertical farms can use much less water than conventional farms.", ["TRUE", "FALSE", "NOT GIVEN"], ["TRUE"], None),
        (0, "tfng", "Vertical farms always use renewable energy.", ["TRUE", "FALSE", "NOT GIVEN"], ["FALSE"], None),
        (0, "tfng", "Lettuce is the most profitable vertical farming crop.", ["TRUE", "FALSE", "NOT GIVEN"], ["NOT GIVEN"], None),
        (0, "tfng", "Some vertical farming companies have stopped operating.", ["TRUE", "FALSE", "NOT GIVEN"], ["TRUE"], None),
        (0, "mcq", "Why are staple crops not grown in vertical farms?", ["A. They need pesticides", "B. They are too costly to produce indoors", "C. Consumers do not want them", "D. They grow too quickly"], ["B"], None),
        (0, "gap_fill", "Indoors, light is provided by ________ lamps.", [], ["LED"], 1),
        (0, "gap_fill", "No ________ are needed because insects cannot get in.", [], ["pesticides"], 1),
        (0, "gap_fill", "Some researchers use artificial ________ to control conditions.", [], ["intelligence"], 1),
    ],
    "headings": ["i. Crops that make economic sense", "ii. Arguments in favour", "iii. The history of greenhouses",
                 "iv. A costly need for power", "v. Ways to make the method cheaper", "vi. Government support schemes"],
}

READING_GT_TEXT = """GREENFIELD COMMUNITY LIBRARY — INFORMATION FOR NEW MEMBERS

Joining: Membership is free for anyone who lives, works or studies in Greenfield. To join, bring one document showing your current address, such as a utility bill or bank statement. Children under 16 must be accompanied by a parent or guardian.

Borrowing: Adult members may borrow up to 12 items at a time. Books can be kept for three weeks, while DVDs must be returned within one week. Items can be renewed twice online or by phone, unless another member has reserved them.

Late returns: There is no charge for overdue children's books. For adult items, a fee of 20p per day is charged, up to a maximum of £5 per item.

Facilities: Free Wi-Fi is available throughout the building. Computers can be booked for one hour per day. Printing costs 10p per black-and-white page and 50p per colour page. A quiet study room is available on the second floor; mobile phones must be switched off there.

Events: A reading group meets on the first Monday of every month. Our homework club for secondary school students runs on Wednesday afternoons during term time."""

READING_GT = {
    "title": "Reading Practice 3 (General Training): Community Library Guide",
    "skill": "reading", "exam_type": "general", "duration_min": 15, "difficulty": "easy", "is_premium": False,
    "description": "General Training Section 1 uslubidagi amaliy matn.",
    "content": {"sections": [{"title": "Greenfield Community Library", "text": READING_GT_TEXT,
                              "instructions": "Answer Questions 1–10."}]},
    "questions": [
        (0, "tfng", "You must pay to become a member of the library.", ["TRUE", "FALSE", "NOT GIVEN"], ["FALSE"], None),
        (0, "tfng", "A bank statement can be used as proof of address.", ["TRUE", "FALSE", "NOT GIVEN"], ["TRUE"], None),
        (0, "tfng", "Children under 16 cannot become members.", ["TRUE", "FALSE", "NOT GIVEN"], ["FALSE"], None),
        (0, "tfng", "The library is open on Sundays.", ["TRUE", "FALSE", "NOT GIVEN"], ["NOT GIVEN"], None),
        (0, "gap_fill", "Adults can borrow a maximum of ________ items.", [], ["12", "twelve"], 1),
        (0, "gap_fill", "DVDs must be returned within one ________.", [], ["week"], 1),
        (0, "gap_fill", "Items can be renewed ________ times.", [], ["two", "2", "twice"], 1),
        (0, "gap_fill", "The maximum late fee per item is £________.", [], ["5", "five"], 1),
        (0, "gap_fill", "The quiet study room is on the ________ floor.", [], ["second", "2nd"], 1),
        (0, "gap_fill", "The homework club meets on ________ afternoons.", [], ["Wednesday", "Wednesdays"], 1),
    ],
}

# =====================================================================================  WRITING
WRITING_1 = {
    "title": "Writing Practice 1 (Academic): Internet access & Remote work",
    "skill": "writing", "exam_type": "academic", "duration_min": 60, "difficulty": "medium", "is_premium": False,
    "description": "Task 1 (bar chart) + Task 2 (opinion essay).",
    "content": {"sections": [{"title": "Writing Test"}]},
    "questions": [
        (0, "writing_task",
         "The bar chart below shows the percentage of households with internet access in four countries in 2005, 2012 and 2020.\n\n"
         "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
         [], [], None, {"task_type": "task1", "min_words": 150, "minutes": 20, "chart": {
             "type": "bar", "title": "Households with internet access (%)", "unit": "%",
             "categories": ["Uzbekistan", "Brazil", "Germany", "Japan"],
             "series": [{"name": "2005", "data": [3, 18, 62, 57]}, {"name": "2012", "data": [27, 40, 85, 82]},
                        {"name": "2020", "data": [76, 71, 94, 91]}]}}),
        (0, "writing_task",
         "Some people believe that working from home is better for employees, while others think it has more disadvantages.\n\n"
         "Discuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.",
         [], [], None, {"task_type": "task2", "min_words": 250, "minutes": 40}),
    ],
}

WRITING_2 = {
    "title": "Writing Practice 2 (Academic): Energy sources & Education",
    "skill": "writing", "exam_type": "academic", "duration_min": 60, "difficulty": "hard", "is_premium": True,
    "description": "Task 1 (line graph) + Task 2 (problem/solution). Premium.",
    "content": {"sections": [{"title": "Writing Test"}]},
    "questions": [
        (0, "writing_task",
         "The line graph shows the share of electricity generated from renewable sources in three regions between 2000 and 2025.\n\n"
         "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
         [], [], None, {"task_type": "task1", "min_words": 150, "minutes": 20, "chart": {
             "type": "line", "title": "Electricity from renewables (%)", "unit": "%",
             "categories": ["2000", "2005", "2010", "2015", "2020", "2025"],
             "series": [{"name": "Europe", "data": [14, 16, 21, 29, 38, 47]}, {"name": "Asia", "data": [17, 16, 18, 22, 27, 35]},
                        {"name": "Central Asia", "data": [21, 20, 19, 18, 20, 26]}]}}),
        (0, "writing_task",
         "In many countries, young people are leaving school without the practical skills needed for everyday life, such as managing money.\n\n"
         "What are the causes of this problem, and what solutions can you suggest?\n\nWrite at least 250 words.",
         [], [], None, {"task_type": "task2", "min_words": 250, "minutes": 40}),
    ],
}

WRITING_GT = {
    "title": "Writing Practice 3 (General Training): Letter & Essay",
    "skill": "writing", "exam_type": "general", "duration_min": 60, "difficulty": "easy", "is_premium": False,
    "description": "Task 1 (rasmiy bo'lmagan xat) + Task 2 (essay).",
    "content": {"sections": [{"title": "Writing Test"}]},
    "questions": [
        (0, "writing_task",
         "You recently stayed with a friend in another city. Write a letter to your friend. In your letter:\n"
         "• thank your friend for the visit\n• describe what you enjoyed most\n• invite your friend to visit you\n\n"
         "Write at least 150 words. Begin your letter: Dear ……,", [], [], None, {"task_type": "task1", "min_words": 150, "minutes": 20}),
        (0, "writing_task",
         "Nowadays many people spend a lot of time on social media. Do the advantages of this outweigh the disadvantages?\n\nWrite at least 250 words.",
         [], [], None, {"task_type": "task2", "min_words": 250, "minutes": 40}),
    ],
}

# =====================================================================================  SPEAKING
SPEAKING_1 = {
    "title": "Speaking Mock 1: Home, Hobbies & Technology",
    "skill": "speaking", "exam_type": "academic", "duration_min": 14, "difficulty": "medium", "is_premium": False,
    "description": "To'liq Speaking testi: Part 1 (intervyu), Part 2 (cue card, 2 daqiqa), Part 3 (muhokama).",
    "content": {},
    "questions": [
        (0, "speaking_prompt", "Part 1 — Introduction and interview",
         ["Let's talk about where you live. Do you live in a house or an apartment?",
          "What do you like most about your neighbourhood?",
          "What do you usually do in your free time?",
          "Have your hobbies changed since you were a child?",
          "How often do you use your mobile phone?"], [], None, {"part": 1, "seconds_per_answer": 30}),
        (0, "speaking_prompt", "Describe a piece of technology that you find very useful.",
         ["what it is", "when you started using it", "how you use it", "and explain why you find it so useful."], [], None,
         {"part": 2, "prep_seconds": 60, "speak_seconds": 120}),
        (0, "speaking_prompt", "Part 3 — Discussion: technology and society",
         ["How has technology changed the way people work in your country?",
          "Do you think older people find it difficult to use new technology? Why?",
          "Some people say technology makes us less sociable. Do you agree?",
          "What technology do you think will be most important in the future?"], [], None, {"part": 3, "seconds_per_answer": 45}),
    ],
}

SPEAKING_2 = {
    "title": "Speaking Mock 2: Travel, Places & Environment",
    "skill": "speaking", "exam_type": "academic", "duration_min": 14, "difficulty": "hard", "is_premium": True,
    "description": "Premium Speaking mock: Part 1–3.",
    "content": {},
    "questions": [
        (0, "speaking_prompt", "Part 1 — Introduction and interview",
         ["Do you enjoy travelling? Why or why not?", "What kind of places do you like to visit?",
          "Do you prefer travelling alone or with others?", "What's the weather like where you live?"], [], None,
         {"part": 1, "seconds_per_answer": 30}),
        (0, "speaking_prompt", "Describe a place you visited that had a beautiful natural environment.",
         ["where it was", "when you went there", "what you did there", "and explain why you liked it."], [], None,
         {"part": 2, "prep_seconds": 60, "speak_seconds": 120}),
        (0, "speaking_prompt", "Part 3 — Discussion: tourism and the environment",
         ["What are the negative effects of tourism on the environment?",
          "Should governments limit the number of tourists in popular places?",
          "How can individuals travel in a more environmentally friendly way?"], [], None, {"part": 3, "seconds_per_answer": 45}),
    ],
}

ALL_TESTS = [LISTENING_1, LISTENING_2, READING_1, READING_2, READING_GT, WRITING_1, WRITING_2, WRITING_GT, SPEAKING_1, SPEAKING_2]

# =====================================================================================  VOCABULARY
# (word, uz, definition, example, pos, ipa, topic, level)
VOCAB = [
    ("abundant", "mo'l-ko'l, serob", "existing in large quantities", "Fresh fruit is abundant in Uzbekistan in summer.", "adj", "/əˈbʌndənt/", "environment", "B2"),
    ("accelerate", "tezlashtirmoq", "to make something happen faster", "The internet has accelerated the spread of information.", "verb", "/əkˈseləreɪt/", "technology", "C1"),
    ("accommodate", "joylashtirmoq, sig'dirmoq", "to provide space or lodging for", "The new hall can accommodate 500 students.", "verb", "/əˈkɒmədeɪt/", "general", "B2"),
    ("acquire", "egallamoq, qo'lga kiritmoq", "to gain or obtain something", "Children acquire languages more easily than adults.", "verb", "/əˈkwaɪə/", "education", "B2"),
    ("adverse", "salbiy, zararli", "having a negative or harmful effect", "Pollution has an adverse effect on public health.", "adj", "/ˈædvɜːs/", "health", "C1"),
    ("advocate", "himoya qilmoq, tarafdori bo'lmoq", "to publicly support an idea", "Many doctors advocate a diet rich in vegetables.", "verb", "/ˈædvəkeɪt/", "society", "C1"),
    ("affordable", "arzon, hamyonbop", "cheap enough for people to buy", "The government aims to build more affordable housing.", "adj", "/əˈfɔːdəbl/", "economy", "B1"),
    ("alleviate", "yengillashtirmoq", "to make a problem less severe", "New roads may alleviate traffic congestion.", "verb", "/əˈliːvieɪt/", "society", "C1"),
    ("ambiguous", "noaniq, ikki ma'noli", "having more than one possible meaning", "The instructions were ambiguous and confused everyone.", "adj", "/æmˈbɪɡjuəs/", "general", "C1"),
    ("anticipate", "oldindan ko'rmoq, kutmoq", "to expect something to happen", "We anticipate a rise in tourist numbers next year.", "verb", "/ænˈtɪsɪpeɪt/", "general", "B2"),
    ("beneficial", "foydali", "having a good effect", "Regular exercise is beneficial for mental health.", "adj", "/ˌbenɪˈfɪʃl/", "health", "B2"),
    ("biodiversity", "biologik xilma-xillik", "the variety of plant and animal life in an area", "Deforestation is a major threat to biodiversity.", "noun", "/ˌbaɪəʊdaɪˈvɜːsəti/", "environment", "C1"),
    ("burden", "yuk, og'irlik", "a heavy responsibility or duty", "Rising costs place a burden on young families.", "noun", "/ˈbɜːdn/", "economy", "B2"),
    ("collaborate", "hamkorlik qilmoq", "to work together with others", "Scientists from ten countries collaborated on the project.", "verb", "/kəˈlæbəreɪt/", "work", "B2"),
    ("commute", "ishga qatnamoq", "to travel regularly between home and work", "Many people commute for over an hour every day.", "verb", "/kəˈmjuːt/", "work", "B1"),
    ("comprehensive", "har tomonlama, to'liq", "including everything that is needed", "The report gives a comprehensive overview of the problem.", "adj", "/ˌkɒmprɪˈhensɪv/", "education", "C1"),
    ("congestion", "tirbandlik", "a situation where a place is too crowded", "Traffic congestion is a serious issue in big cities.", "noun", "/kənˈdʒestʃən/", "cities", "B2"),
    ("consequence", "oqibat", "a result of an action", "Climate change has serious consequences for agriculture.", "noun", "/ˈkɒnsɪkwəns/", "general", "B2"),
    ("conserve", "asramoq, tejamoq", "to protect from harm or waste", "We should conserve water during dry summers.", "verb", "/kənˈsɜːv/", "environment", "B2"),
    ("considerable", "sezilarli, katta", "large in size or amount", "The project required a considerable amount of money.", "adj", "/kənˈsɪdərəbl/", "general", "B2"),
    ("contribute", "hissa qo'shmoq", "to help cause or achieve something", "Tourism contributes greatly to the national economy.", "verb", "/kənˈtrɪbjuːt/", "economy", "B2"),
    ("crucial", "hal qiluvchi, juda muhim", "extremely important", "Sleep is crucial for learning and memory.", "adj", "/ˈkruːʃl/", "general", "B2"),
    ("curriculum", "o'quv dasturi", "the subjects studied in a school", "Coding is now part of the school curriculum.", "noun", "/kəˈrɪkjələm/", "education", "B2"),
    ("decline", "kamaymoq; pasayish", "to become smaller or fewer", "The number of smokers has declined sharply.", "verb", "/dɪˈklaɪn/", "trends", "B2"),
    ("deteriorate", "yomonlashmoq", "to become worse", "Air quality deteriorates in winter.", "verb", "/dɪˈtɪəriəreɪt/", "environment", "C1"),
    ("detrimental", "zararli", "causing harm or damage", "Too much screen time is detrimental to children's sleep.", "adj", "/ˌdetrɪˈmentl/", "health", "C1"),
    ("diminish", "kamaytirmoq, susaytirmoq", "to make or become less", "The medicine diminished the pain.", "verb", "/dɪˈmɪnɪʃ/", "general", "C1"),
    ("disparity", "tafovut, nomutanosiblik", "a large difference between things", "There is a disparity between urban and rural incomes.", "noun", "/dɪˈspærəti/", "society", "C1"),
    ("diverse", "xilma-xil", "showing a great deal of variety", "Tashkent has a diverse population.", "adj", "/daɪˈvɜːs/", "society", "B2"),
    ("emission", "chiqindi gaz, chiqarish", "gas or other substance sent into the air", "Car emissions are a major cause of air pollution.", "noun", "/iˈmɪʃn/", "environment", "B2"),
    ("enhance", "yaxshilamoq, oshirmoq", "to improve the quality of something", "Reading widely enhances your vocabulary.", "verb", "/ɪnˈhɑːns/", "education", "B2"),
    ("essential", "zarur, muhim", "absolutely necessary", "Clean water is essential for life.", "adj", "/ɪˈsenʃl/", "general", "B1"),
    ("exacerbate", "kuchaytirmoq (yomonlashtirmoq)", "to make a bad situation worse", "Cutting public transport will exacerbate traffic problems.", "verb", "/ɪɡˈzæsəbeɪt/", "society", "C2"),
    ("facilitate", "osonlashtirmoq", "to make an action easier", "Technology facilitates communication across borders.", "verb", "/fəˈsɪlɪteɪt/", "technology", "C1"),
    ("fluctuate", "tebranib turmoq", "to change frequently in level or amount", "Prices fluctuated throughout the year.", "verb", "/ˈflʌktʃueɪt/", "trends", "C1"),
    ("fundamental", "asosiy, tub", "forming a necessary base", "Education is a fundamental human right.", "adj", "/ˌfʌndəˈmentl/", "society", "B2"),
    ("globalisation", "globallashuv", "the process of the world becoming more connected", "Globalisation has changed local cultures.", "noun", "/ˌɡləʊbəlaɪˈzeɪʃn/", "society", "B2"),
    ("hinder", "to'sqinlik qilmoq", "to make it difficult for something to happen", "Lack of funding hinders scientific research.", "verb", "/ˈhɪndə/", "general", "C1"),
    ("implement", "amalga oshirmoq", "to put a plan into action", "The school implemented a new reading programme.", "verb", "/ˈɪmplɪment/", "work", "B2"),
    ("inevitable", "muqarrar", "certain to happen", "Some job losses due to automation are inevitable.", "adj", "/ɪnˈevɪtəbl/", "technology", "C1"),
    ("infrastructure", "infratuzilma", "basic systems such as roads and power supply", "The country invested heavily in infrastructure.", "noun", "/ˈɪnfrəstrʌktʃə/", "cities", "B2"),
    ("innovative", "innovatsion, yangicha", "introducing new ideas or methods", "The company is known for its innovative products.", "adj", "/ˈɪnəveɪtɪv/", "technology", "B2"),
    ("issue", "muammo, masala", "an important topic or problem", "Unemployment is a key issue for young people.", "noun", "/ˈɪʃuː/", "general", "B1"),
    ("lifestyle", "turmush tarzi", "the way in which a person lives", "A sedentary lifestyle can lead to health problems.", "noun", "/ˈlaɪfstaɪl/", "health", "B1"),
    ("mitigate", "yumshatmoq, kamaytirmoq", "to make something less harmful", "Planting trees can mitigate the effects of heat.", "verb", "/ˈmɪtɪɡeɪt/", "environment", "C1"),
    ("notably", "ayniqsa", "especially; in particular", "Several countries, notably Japan, saw a decline.", "adv", "/ˈnəʊtəbli/", "trends", "C1"),
    ("obesity", "semizlik", "the condition of being very overweight", "Childhood obesity is increasing worldwide.", "noun", "/əʊˈbiːsəti/", "health", "B2"),
    ("obstacle", "to'siq", "something that blocks progress", "Language can be an obstacle to finding work abroad.", "noun", "/ˈɒbstəkl/", "general", "B2"),
    ("phenomenon", "hodisa", "a fact or situation that is observed", "Online shopping is a relatively new phenomenon.", "noun", "/fəˈnɒmɪnən/", "society", "C1"),
    ("plummet", "keskin tushib ketmoq", "to fall very quickly", "Sales plummeted during the crisis.", "verb", "/ˈplʌmɪt/", "trends", "C1"),
    ("predominantly", "asosan", "mainly; for the most part", "The audience was predominantly young.", "adv", "/prɪˈdɒmɪnəntli/", "trends", "C1"),
    ("prioritise", "birinchi o'ringa qo'ymoq", "to treat as more important", "Governments should prioritise healthcare.", "verb", "/praɪˈɒrətaɪz/", "society", "B2"),
    ("proportion", "ulush, nisbat", "a part of a whole", "A large proportion of students live at home.", "noun", "/prəˈpɔːʃn/", "trends", "B2"),
    ("pursue", "intilmoq, davom ettirmoq", "to follow or try to achieve", "She plans to pursue a career in medicine.", "verb", "/pəˈsjuː/", "education", "B2"),
    ("rapid", "tez, jadal", "happening very quickly", "The city has seen rapid population growth.", "adj", "/ˈræpɪd/", "trends", "B1"),
    ("reluctant", "istamaydigan", "unwilling to do something", "Many people are reluctant to change their habits.", "adj", "/rɪˈlʌktənt/", "general", "B2"),
    ("renewable", "qayta tiklanadigan", "able to be replaced naturally", "Solar power is a renewable source of energy.", "adj", "/rɪˈnjuːəbl/", "environment", "B2"),
    ("resident", "aholi, yashovchi", "a person who lives in a place", "Local residents protested against the new factory.", "noun", "/ˈrezɪdənt/", "cities", "B1"),
    ("significant", "muhim, sezilarli", "important or large enough to be noticed", "There was a significant increase in sales.", "adj", "/sɪɡˈnɪfɪkənt/", "trends", "B2"),
    ("sedentary", "kam harakatli", "involving a lot of sitting", "Office work is often sedentary.", "adj", "/ˈsednteri/", "health", "C1"),
    ("substantial", "katta, salmoqli", "large in amount or importance", "They received a substantial grant for research.", "adj", "/səbˈstænʃl/", "economy", "C1"),
    ("sustainable", "barqaror", "able to continue without harming the environment", "We need more sustainable forms of transport.", "adj", "/səˈsteɪnəbl/", "environment", "B2"),
    ("tendency", "moyillik", "a likelihood to behave in a certain way", "Teenagers have a tendency to stay up late.", "noun", "/ˈtendənsi/", "general", "B2"),
    ("unprecedented", "misli ko'rilmagan", "never having happened before", "The pandemic caused unprecedented disruption.", "adj", "/ʌnˈpresɪdentɪd/", "society", "C1"),
    ("urbanisation", "urbanizatsiya", "the growth of towns and cities", "Rapid urbanisation creates housing shortages.", "noun", "/ˌɜːbənaɪˈzeɪʃn/", "cities", "C1"),
    ("versatile", "ko'p qirrali", "able to be used in many ways", "A smartphone is a versatile device.", "adj", "/ˈvɜːsətaɪl/", "technology", "C1"),
    ("vulnerable", "zaif, himoyasiz", "easily harmed", "Elderly people are more vulnerable to heatwaves.", "adj", "/ˈvʌlnərəbl/", "health", "B2"),
    ("widespread", "keng tarqalgan", "existing in many places", "There is widespread support for the new law.", "adj", "/ˈwaɪdspred/", "society", "B2"),
    ("workforce", "ishchi kuchi", "all the people who work in a country or company", "Women make up half of the workforce.", "noun", "/ˈwɜːkfɔːs/", "work", "B2"),
    ("deadline", "oxirgi muddat", "a time by which something must be done", "The deadline for applications is Friday.", "noun", "/ˈdedlaɪn/", "work", "B1"),
    ("scholarship", "grant, stipendiya", "money given to a student to pay for study", "She won a scholarship to study in the UK.", "noun", "/ˈskɒləʃɪp/", "education", "B1"),
    ("insight", "chuqur tushuncha", "a clear understanding of something", "The book gives an insight into life in the 1920s.", "noun", "/ˈɪnsaɪt/", "general", "B2"),
]

# =====================================================================================  GAMES
GRAMMAR_ITEMS = [
    {"sentence": "If I ____ more time, I would learn another language.", "options": ["had", "have", "will have", "would have"], "answer": "had", "explanation": "Second conditional: If + Past Simple, would + fe'l."},
    {"sentence": "She has lived in Tashkent ____ 2015.", "options": ["since", "for", "from", "during"], "answer": "since", "explanation": "Aniq vaqt nuqtasi bilan ‘since’."},
    {"sentence": "The report ____ by the committee last week.", "options": ["was written", "wrote", "has written", "is writing"], "answer": "was written", "explanation": "O'tgan zamon majhul nisbati: was/were + V3."},
    {"sentence": "Neither the teacher nor the students ____ happy with the result.", "options": ["were", "was", "is", "been"], "answer": "were", "explanation": "‘neither…nor’da fe'l yaqin turgan egaga moslashadi (students → were)."},
    {"sentence": "By the time we arrived, the film ____.", "options": ["had started", "started", "has started", "starts"], "answer": "had started", "explanation": "O'tmishdagi boshqa harakatdan oldin — Past Perfect."},
    {"sentence": "There is ____ information about this topic online.", "options": ["a lot of", "many", "a few", "several"], "answer": "a lot of", "explanation": "‘information’ sanalmaydi, ‘many’ ishlatilmaydi."},
    {"sentence": "This is the ____ book I have ever read.", "options": ["most interesting", "more interesting", "interestingest", "much interesting"], "answer": "most interesting", "explanation": "Uzun sifatlarning orttirma darajasi: the most + sifat."},
    {"sentence": "I look forward to ____ from you.", "options": ["hearing", "hear", "heard", "be hearing"], "answer": "hearing", "explanation": "‘look forward to’ dan keyin -ing shakl."},
    {"sentence": "The number of students ____ increased significantly.", "options": ["has", "have", "are", "were"], "answer": "has", "explanation": "‘The number of …’ birlik hisoblanadi."},
    {"sentence": "He suggested ____ a taxi to the airport.", "options": ["taking", "to take", "take", "took"], "answer": "taking", "explanation": "‘suggest’ dan keyin -ing yoki ‘that’ gap."},
    {"sentence": "____ the rain, the match continued.", "options": ["Despite", "Although", "Because", "However"], "answer": "Despite", "explanation": "‘Despite’ + ot; ‘Although’ + to'liq gap."},
    {"sentence": "The city ____ I was born is very small.", "options": ["where", "which", "who", "what"], "answer": "where", "explanation": "Joyni bildiruvchi relative clause — ‘where’."},
    {"sentence": "Not only ____ the exam, but she also got the highest score.", "options": ["did she pass", "she passed", "she did pass", "passed she"], "answer": "did she pass", "explanation": "‘Not only’ boshida — inversiya."},
    {"sentence": "You ____ wear a uniform; it's optional.", "options": ["don't have to", "mustn't", "can't", "shouldn't to"], "answer": "don't have to", "explanation": "Majburiy emas — ‘don't have to’."},
    {"sentence": "The graph shows a ____ increase in sales.", "options": ["dramatic", "dramatically", "drama", "dramatize"], "answer": "dramatic", "explanation": "Otdan oldin sifat: a dramatic increase."},
    {"sentence": "Sales increased ____ between 2010 and 2020.", "options": ["steadily", "steady", "steadiness", "steadier"], "answer": "steadily", "explanation": "Fe'lni ravish tasvirlaydi: increased steadily."},
    {"sentence": "I wish I ____ harder at school.", "options": ["had studied", "studied", "have studied", "would study"], "answer": "had studied", "explanation": "O'tmish haqida afsus: wish + Past Perfect."},
    {"sentence": "Each of the candidates ____ a short interview.", "options": ["has", "have", "are having", "were"], "answer": "has", "explanation": "‘Each of’ — birlik fe'l."},
    {"sentence": "It's high time we ____ action on climate change.", "options": ["took", "take", "will take", "taking"], "answer": "took", "explanation": "‘It's high time’ + Past Simple."},
    {"sentence": "The more you practise, ____ you become.", "options": ["the more confident", "more confident", "the most confident", "confident"], "answer": "the more confident", "explanation": "‘The more…, the more…’ tuzilmasi."},
]

SPEAKING_SENTENCES = [
    {"text": "Technology has transformed the way we communicate.", "uz": "Texnologiya muloqot usulimizni o'zgartirdi."},
    {"text": "I strongly believe that education should be free for everyone.", "uz": "Ta'lim hamma uchun bepul bo'lishi kerak deb hisoblayman."},
    {"text": "In my opinion, public transport is the best solution to traffic congestion.", "uz": "Menimcha, jamoat transporti tirbandlikka eng yaxshi yechim."},
    {"text": "The graph illustrates a significant increase in renewable energy.", "uz": "Grafik qayta tiklanadigan energiyaning sezilarli o'sishini ko'rsatadi."},
    {"text": "One of the main advantages of living in a city is convenience.", "uz": "Shaharda yashashning asosiy afzalliklaridan biri — qulaylik."},
    {"text": "I'd like to talk about a memorable trip I took last summer.", "uz": "O'tgan yozdagi esda qolarli sayohatim haqida gapirmoqchiman."},
    {"text": "Governments should invest more in healthcare and education.", "uz": "Hukumatlar sog'liqni saqlash va ta'limga ko'proq sarmoya kiritishi kerak."},
    {"text": "Learning a foreign language opens many doors.", "uz": "Chet tilini o'rganish ko'p eshiklarni ochadi."},
    {"text": "Climate change is one of the most serious challenges we face.", "uz": "Iqlim o'zgarishi biz duch kelayotgan eng jiddiy muammolardan biri."},
    {"text": "To sum up, the benefits clearly outweigh the drawbacks.", "uz": "Xulosa qilib aytganda, foydalari kamchiliklaridan ustun."},
    {"text": "Working from home allows people to manage their time more flexibly.", "uz": "Uydan ishlash vaqtni moslashuvchan boshqarish imkonini beradi."},
    {"text": "Reading books regularly can significantly improve your vocabulary.", "uz": "Muntazam kitob o'qish so'z boyligini sezilarli oshiradi."},
]
