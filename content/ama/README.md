# AMA Content Standard

This directory contains structured content for the AI-powered Ask Me Anything (AMA) system.

## File Format

Each markdown file represents a knowledge area or topic. The AI uses these files to answer questions accurately.

### Frontmatter Structure

```yaml
---
title: "Short descriptive title"
category: "education | experience | projects | skills | personal"
topics: ["keyword1", "keyword2", "keyword3"]
dateRange: "2016-2017" # Optional for time-based content
---
```

### Content Structure

After the frontmatter, write clear, informative content in markdown:

- Use **headers** to organize sections
- Use **lists** for skills, technologies, accomplishments
- Use **blockquotes** for important highlights or quotes
- Include **specific details** - technologies, metrics, achievements
- Write in **first person** for personal content
- Be **concise but comprehensive**

### Example

```markdown
---
title: "Master's in Computer Science"
category: "education"
topics: ["education", "computer science", "algorithms", "cloud computing", "UNC Charlotte"]
dateRange: "2016-2017"
---

I earned my Master's degree in Computer Science from UNC Charlotte, where I gained hands-on experience with advanced algorithms, data structures, mobile application development, cloud computing, and network-based applications.

## Key Achievements

- Developed multiple projects applying practical programming knowledge
- Gained expertise in algorithms and data structures
- Worked on mobile and cloud computing technologies
- Built network-based applications

The program challenged me to think critically about problem-solving and develop solutions using diverse technical approaches.

> "Good, better, best. Never let it rest. 'Till your good is better and your better is the best."
```

## Content Organization

Files are loaded alphabetically. Use numeric prefixes to control order:
- `01-overview.md` - Introduction and summary
- `02-education.md` - Educational background
- `03-experience-*.md` - Work experience entries
- `04-projects-*.md` - Project descriptions
- `05-skills.md` - Technical skills and expertise

## AI Integration

The AMA system will:
1. Load all markdown files from this directory
2. Parse frontmatter and content
3. Build a searchable knowledge base
4. Generate contextual system prompts for the LLM
5. Include relevant content snippets when answering questions

## Best Practices

- **Be specific**: Include technologies, frameworks, tools by name
- **Include metrics**: Numbers, percentages, time periods when applicable
- **Stay current**: Update content regularly
- **Use keywords**: Think about what users might ask
- **Be authentic**: Write in a natural, professional tone
