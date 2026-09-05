# Attendify — SY BSc IT Attendance Management System

A polished, admin-first attendance management web application designed for faculty and administrators to mark, manage, review, and analyze attendance for the **SY BSc IT batch (Single Batch · 60 Students)**.

---

## 🎯 Core Product Mission

The application is built around one primary workflow:
**"A faculty or admin should be able to mark attendance for 60 students as quickly and accurately as possible (under 60 seconds)."**

### The North-Star Flow:
1. **Open Attendify** → Click prominent **+ Mark Attendance**.
2. **Select Subject, Date, and Lecture Time**.
3. All **60 enrolled students** load immediately, defaulted to **Present**.
4. Quickly mark absentees or late arrivals using 1-click toggles or search.
5. Sticky live headcount automatically reconciles: `Present + Absent + Late = 60`.
6. Click **Save Attendance Session**.
7. The session is recorded in **Attendance History**, and the **Dashboard**, **Student Roster**, **Subject Averages**, and **Analytics** update in real-time.

---

## 👥 Student Roster (SY BSc IT)

The application comes pre-loaded with all **60 real students** (Roll Numbers 1 to 60) enrolled in the single SY BSc IT batch:

1. Andre Harshad Balu
2. Ansari Farman Lukman
3. Behera Shubham Binod
4. Chaurasiya Shivanshu Ashok
5. Chendvankar Tanishq Abhijit
6. Choursia Shraddha Madreshkumar
7. Dudaye Shubham Pandurang
8. Gupta Himanshu Laxmikant
9. Gupta Nikhil Ganesh
10. Gupta Raj Omprakash
11. Gurav Shreya Prakash
12. Jaiswal Khushi Dashrath
13. Jaiswal Prince Dharmendra
14. Kottilaparambil Suvidh Sunil
15. Kushwaha Vinit Vidyanand
16. Mishra Shashank Sureshkumar
17. Nesamoney Cinderella Jaiross
18. Pal Aryan Naveen
19. Pal Ashish Ramavadh
20. Pal Laxmi Kapildev
21. Pandey Sharad Umeshchandra
22. Rajput Prachi Narsing
23. Reddi Mahesh Chandranna
24. Sawant Narayan Manohar
25. Sharma Abhay Chandrika
26. Sharma Kartike Sunil
27. Shevale Pratham Dryaneshwar
28. Singh Aniket Rajesh
29. Singh Anurag Kush
30. Singh Aryan Sanjay
31. Singh Bablu Kumar Santosh Kumar
32. Singh Janvi Anil
33. Singh Noel Damer
34. Singh Sachi Ashutosh
35. Singh Sandhya Amarnath
36. Singh Vikash Kumar Laxman
37. Yadav Pooja Om Prakash
38. Yadav Prince Virendrakumar
39. Yadav Vivek Rudra
40. Yadav Yogank Ashok
41. Mishra Aditya Rajesh
42. Pardhe Harshit Chandrakant
43. Jaiswal Moksh Rajkumar
44. Ghadigaonkar Maithili Mahesh
45. Pal Sanjana Rajendra
46. Tiwari Pavan Awadesh
47. Thorat Kaustubh Ramesh
48. Makwana Ayushi Nilesh
49. Dubey Harsh Puneet
50. Mourya Ansh Deenanath
51. Morye Mihir Mangesh
52. Pandey Sakshi
53. Uttam Tripathi
54. Anchal Jaiswar
55. Harshit Tiwari
56. Shivam Patel
57. Shivansu Mishra
58. Abhay Yadav
59. Mahek Pandya
60. Abhishek Yadav

---

## 📐 Academic Courses (Subjects)

The system is configured with the core curriculum subjects:


---

## 🚀 Key Modules & Architecture

- **`Dashboard`**: Operational overview displaying overall batch attendance %, total lectures held, recent sessions with quick Edit actions, and defaulters needing attention (< 75%).
- **`Mark Attendance`**: Optimized 60-student register with default-present workflow, search-by-roll/name, absentee filters, sticky live count pills, and save verification.
- **`Students`**: Full 60-student directory showing roll number, lectures attended vs missed, attendance percentage, status badges (Safe / Warning / Defaulter), and student modal breakdowns.
- **`Subjects`**: Course directory showing teacher assignments, total sessions held, and average class attendance.
- **`Attendance History`**: Audit ledger of all sessions with subject filter, timestamps, headcounts, and session editing/deletion.
- **`Analytics`**: High-density batch segmentation (Safe ≥75%, Warning 65-74%, Defaulters <65%), course comparisons, and total attendance marks ratios.
- **`Reports`**: One-click exports of the Full Batch Ledger CSV, Defaulters List CSV (< 75%), and Session Audit Log CSV.
- **`Settings`**: Safe threshold customization (default: 75% safe, 65% warning), JSON backup export/import, and database reset.

---

## 🛠️ Technology Stack

- **Zero dependencies / Vanilla JS / HTML5 / CSS3**
- Native LocalStorage persistence with backup-key rotation (`attendify:v2`)
- Strict SVG constraint styling preventing card overflows
- Clean Linear/Apple-inspired academic administration theme
