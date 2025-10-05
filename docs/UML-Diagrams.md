# 📐 UML Diagrams - Literature Review Manager

## 1. Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "User" as User
actor "System" as System

rectangle "Literature Review Manager" {
  
  package "Authentication" {
    (UC1: Đăng ký/Đăng nhập) as UC1
    (UC2: Quản lý profile) as UC2
  }
  
  package "Paper Management" {
    (UC3: Thêm bài báo mới) as UC3
    (UC4: Chỉnh sửa/Xóa bài báo) as UC4
    (UC5: Upload & Quản lý PDF) as UC5
    (UC6: Tìm kiếm bài báo) as UC6
  }
  
  package "Personal Library" {
    (UC7: Thêm bài báo vào\nthư viện cá nhân) as UC7
    (UC8: Ghi chú & Tag) as UC8
  }
  
  package "Citation Network" {
    (UC9: Tạo quan hệ trích dẫn) as UC9
    (UC10: Xem đồ thị citation) as UC10
  }
  
  package "AI Analysis" {
    (UC11: Sinh tóm tắt\n& phân tích) as UC11
  }
  
  User --> UC1
  User --> UC2
  User --> UC3
  User --> UC4
  User --> UC5
  User --> UC6
  User --> UC7
  User --> UC8
  User --> UC9
  User --> UC10
  User --> UC11
  
  UC3 ..> UC5 : <<include>>
  UC7 ..> UC6 : <<extend>>
  UC8 ..> UC7 : <<extend>>
  UC10 ..> UC9 : <<include>>
  
  System ..> UC11 : <<auto-generate>>
}

@enduml
```

## 2. Class Diagram

```plantuml
@startuml
skinparam classAttributeIconSize 0

class User {
  -id: int
  -email: string
  -password: string
  -fullName: string
  -avatarUrl: string
  -bio: string
  -affiliation: string
  -researchInterests: string
  -createdAt: Date
  -updatedAt: Date
  -lastLogin: Date
  -isActive: boolean
  +register()
  +login()
  +updateProfile()
  +changePassword()
}

class Paper {
  -id: int
  -title: string
  -authors: string
  -abstract: string
  -publicationYear: int
  -journal: string
  -doi: string
  -url: string
  -keywords: string
  -addedBy: int
  -createdAt: Date
  -updatedAt: Date
  +create()
  +update()
  +delete()
  +search()
}

class PDFFile {
  -id: int
  -paperId: int
  -fileName: string
  -filePath: string
  -fileSize: bigint
  -uploadedBy: int
  -uploadedAt: Date
  +upload()
  +download()
  +delete()
}

class Tag {
  -id: int
  -name: string
  -color: string
  -createdAt: Date
  +create()
  +update()
  +delete()
  +getAll()
}

class UserLibrary {
  -id: int
  -userId: int
  -paperId: int
  -status: enum
  -rating: int
  -addedAt: Date
  +addToLibrary()
  +removeFromLibrary()
  +updateStatus()
  +rate()
}

class Note {
  -id: int
  -userId: int
  -paperId: int
  -content: string
  -highlightText: string
  -pageNumber: int
  -color: string
  -createdAt: Date
  -updatedAt: Date
  +create()
  +update()
  +delete()
  +getByPaper()
}

class Citation {
  -id: int
  -citingPaperId: int
  -citedPaperId: int
  -citationContext: string
  -createdBy: int
  -createdAt: Date
  +create()
  +delete()
  +getCitationNetwork()
  +getCitationCount()
}

class AISummary {
  -id: int
  -paperId: int
  -summary: string
  -keyFindings: string
  -methodology: string
  -limitations: string
  -generatedAt: Date
  +generate()
  +regenerate()
  +get()
}

' Relationships
User "1" -- "0..*" Paper : adds >
User "1" -- "0..*" UserLibrary : has >
User "1" -- "0..*" Note : writes >
User "1" -- "0..*" Citation : creates >
User "1" -- "0..*" PDFFile : uploads >

Paper "1" -- "0..*" PDFFile : has >
Paper "1" -- "0..*" UserLibrary : in >
Paper "1" -- "0..*" Note : has >
Paper "0..*" -- "0..*" Tag : tagged with >
Paper "1" -- "0..1" AISummary : has >
Paper "1" -- "0..*" Citation : citing >
Paper "1" -- "0..*" Citation : cited by >

@enduml
```

## 3. Sequence Diagram - User Login

```plantuml
@startuml
actor User
participant "Frontend\n(React)" as Frontend
participant "Auth\nController" as AuthCtrl
participant "Auth\nService" as AuthSvc
participant "User\nRepository" as UserRepo
database "MySQL" as DB

User -> Frontend: Enter email & password
Frontend -> AuthCtrl: POST /auth/login\n{email, password}
activate AuthCtrl

AuthCtrl -> AuthSvc: validateUser(email, password)
activate AuthSvc

AuthSvc -> UserRepo: findByEmail(email)
activate UserRepo
UserRepo -> DB: SELECT * FROM users\nWHERE email=?
DB --> UserRepo: user data
UserRepo --> AuthSvc: User entity
deactivate UserRepo

AuthSvc -> AuthSvc: comparePassword(password, hash)
alt Password valid
  AuthSvc -> AuthSvc: generateJWT(user)
  AuthSvc --> AuthCtrl: {accessToken, user}
  deactivate AuthSvc
  AuthCtrl --> Frontend: 200 OK\n{token, user}
  deactivate AuthCtrl
  Frontend -> Frontend: Store token in localStorage
  Frontend --> User: Redirect to Dashboard
else Password invalid
  AuthSvc --> AuthCtrl: UnauthorizedException
  AuthCtrl --> Frontend: 401 Unauthorized
  Frontend --> User: Show error message
end

@enduml
```

## 4. Sequence Diagram - Add Paper with Citation

```plantuml
@startuml
actor User
participant "Frontend" as FE
participant "Paper\nController" as PaperCtrl
participant "Paper\nService" as PaperSvc
participant "Citation\nService" as CiteSvc
participant "PDF\nService" as PDFSvc
database "MySQL" as DB

User -> FE: Fill paper form\n+ Upload PDF\n+ Add citations
FE -> PaperCtrl: POST /papers\n{paperData, pdfFile, citations}
activate PaperCtrl

PaperCtrl -> PaperSvc: createPaper(paperData)
activate PaperSvc
PaperSvc -> DB: INSERT INTO papers
DB --> PaperSvc: newPaper {id: 123}
deactivate PaperSvc

PaperCtrl -> PDFSvc: uploadPDF(file, paperId)
activate PDFSvc
PDFSvc -> PDFSvc: saveToFileSystem()
PDFSvc -> DB: INSERT INTO pdf_files
DB --> PDFSvc: pdfRecord
PDFSvc --> PaperCtrl: uploadSuccess
deactivate PDFSvc

loop For each citation
  PaperCtrl -> CiteSvc: createCitation(citingId, citedId)
  activate CiteSvc
  CiteSvc -> DB: INSERT INTO citations
  DB --> CiteSvc: citationRecord
  CiteSvc --> PaperCtrl: success
  deactivate CiteSvc
end

PaperCtrl --> FE: 201 Created\n{paper, pdf, citations}
deactivate PaperCtrl
FE --> User: Show success message\nRedirect to paper detail

@enduml
```

## 5. Sequence Diagram - Generate AI Summary

```plantuml
@startuml
actor User
participant "Frontend" as FE
participant "Summary\nController" as SumCtrl
participant "Summary\nService" as SumSvc
participant "AI Service\n(OpenAI/Local)" as AI
participant "PDF\nService" as PDFSvc
database "MySQL" as DB

User -> FE: Click "Generate Summary"
FE -> SumCtrl: POST /summaries/generate/{paperId}
activate SumCtrl

SumCtrl -> SumSvc: generateSummary(paperId)
activate SumSvc

SumSvc -> DB: SELECT * FROM papers\nWHERE id=?
DB --> SumSvc: paperData

alt PDF exists
  SumSvc -> PDFSvc: extractText(paperId)
  activate PDFSvc
  PDFSvc --> SumSvc: fullText
  deactivate PDFSvc
else No PDF
  SumSvc -> SumSvc: Use abstract + keywords
end

SumSvc -> AI: generateSummary(text)
activate AI
AI -> AI: Process with LLM
AI --> SumSvc: {summary, keyFindings,\nmethodology, limitations}
deactivate AI

SumSvc -> DB: INSERT INTO ai_summaries
DB --> SumSvc: summaryRecord

SumSvc --> SumCtrl: summaryData
deactivate SumSvc

SumCtrl --> FE: 200 OK\n{summary}
deactivate SumCtrl

FE --> User: Display summary

@enduml
```

## 6. Activity Diagram - Search Papers

```plantuml
@startuml
start

:User enters search query;

:Submit search form;

fork
  :Search in title;
fork again
  :Search in abstract;
fork again
  :Search in keywords;
fork again
  :Search in authors;
end fork

:Combine results;

:Apply filters (year, tags, status);

:Sort results (relevance, date);

if (Results found?) then (yes)
  :Display results list;
  
  :User clicks on paper;
  
  :Show paper details;
  
  if (In user library?) then (yes)
    :Show notes & tags;
  else (no)
    :Show "Add to library" button;
  endif
  
else (no)
  :Show "No results found";
  :Suggest adding new paper;
endif

stop
@enduml
```

## 7. Activity Diagram - Citation Network Visualization

```plantuml
@startuml
start

:User opens paper detail;

:Click "View Citation Network";

:Frontend requests citation data;

fork
  :Get papers citing this paper;
fork again
  :Get papers cited by this paper;
end fork

:Combine citation relationships;

:Build graph structure\n{nodes: papers, edges: citations};

:Send data to D3.js;

:D3.js renders force-directed graph;

partition "Interactive Features" {
  repeat
    :User interacts with graph;
    
    if (Action?) then (Click node)
      :Show paper details in sidebar;
    elseif (Hover node) then
      :Highlight connected papers;
    elseif (Zoom/Pan) then
      :Update viewport;
    elseif (Filter) then
      :Apply year/tag filters;
      :Re-render graph;
    endif
    
  repeat while (Continue exploring?) is (yes)
  ->no;
}

:User closes visualization;

stop
@enduml
```

---

## 📊 Diagram Tools

To render these diagrams:

1. **PlantUML**: Use VS Code extension "PlantUML" or online editor: https://www.plantuml.com/plantuml/uml/
2. **Draw.io**: Import PlantUML or create custom diagrams
3. **Mermaid**: Alternative syntax supported by GitHub

## 🎯 Key Design Patterns

- **MVC Pattern**: Controller → Service → Repository
- **Dependency Injection**: NestJS IoC container
- **Repository Pattern**: TypeORM entities
- **DTO Pattern**: Request/Response validation
- **Strategy Pattern**: Multiple search strategies
- **Observer Pattern**: Real-time updates (WebSocket)

