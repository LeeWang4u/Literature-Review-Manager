-- ============================================
-- Literature Review Manager - Database Schema
-- Database: MySQL
-- ============================================

-- Bảng Users (UC1, UC2)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    affiliation VARCHAR(255),
    research_interests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Papers (UC3, UC4)
CREATE TABLE papers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    authors TEXT NOT NULL,
    abstract TEXT,
    publication_year INT,
    journal VARCHAR(255),
    volume VARCHAR(50),
    issue VARCHAR(50),
    pages VARCHAR(50),
    doi VARCHAR(255),
    url VARCHAR(500),
    keywords TEXT,
    added_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_title (title(255)),
    INDEX idx_year (publication_year),
    INDEX idx_added_by (added_by),
    FULLTEXT idx_fulltext (title, abstract, keywords)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng PDF Files (UC5)
CREATE TABLE pdf_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paper_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_paper_id (paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Tags (UC8)
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Paper-Tag relationship (UC8)
CREATE TABLE paper_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paper_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_paper_tag (paper_id, tag_id),
    INDEX idx_paper_id (paper_id),
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng User Library (UC7)
CREATE TABLE user_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    paper_id INT NOT NULL,
    status ENUM('to-read', 'reading', 'read', 'favorite') DEFAULT 'to-read',
    rating INT CHECK (rating >= 1 AND rating <= 5),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_paper (user_id, paper_id),
    INDEX idx_user_id (user_id),
    INDEX idx_paper_id (paper_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Notes (UC8)
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    paper_id INT NOT NULL,
    content TEXT NOT NULL,
    highlight_text TEXT,
    page_number INT,
    color VARCHAR(7) DEFAULT '#FBBF24',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    INDEX idx_user_paper (user_id, paper_id),
    INDEX idx_paper_id (paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Citations (UC9, UC10)
CREATE TABLE citations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    citing_paper_id INT NOT NULL,
    cited_paper_id INT NOT NULL,
    citation_context TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (citing_paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (cited_paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_citation (citing_paper_id, cited_paper_id),
    INDEX idx_citing (citing_paper_id),
    INDEX idx_cited (cited_paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng AI Summaries (UC11)
CREATE TABLE ai_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paper_id INT NOT NULL,
    summary TEXT NOT NULL,
    key_findings TEXT,
    methodology TEXT,
    limitations TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    INDEX idx_paper_id (paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample Data for Testing
-- ============================================

-- Insert sample user
INSERT INTO users (email, password, full_name, affiliation, research_interests) VALUES
('admin@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Nguyen Van A', 'University of Science', 'Machine Learning, Natural Language Processing');

-- Insert sample tags
INSERT INTO tags (name, color) VALUES
('Machine Learning', '#3B82F6'),
('Deep Learning', '#8B5CF6'),
('NLP', '#10B981'),
('Computer Vision', '#F59E0B'),
('Survey Paper', '#EF4444');
