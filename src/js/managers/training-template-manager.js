/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Training Template Manager
 * Handles creation, editing, and management of training templates
 */

class TrainingTemplateManager {
  constructor() {
    this.templates = [];
    this.load();
  }

  getDefaultTemplates() {
    return [
      {
        id: 'template-default-1',
        name: t('example_template_1'),
        description: t('example_template_1_desc'),
        positions: [t('prone'), t('prone'), t('standing'), t('standing')],
        shotsPerSeries: 5,
        isDefault: true,
      },
      {
        id: 'template-default-2',
        name: t('example_template_2'),
        description: t('example_template_2_desc'),
        positions: [t('prone'), t('standing'), t('prone'), t('standing')],
        shotsPerSeries: 5,
        isDefault: true,
      },
      {
        id: 'template-default-3',
        name: t('example_template_3'),
        description: t('example_template_3_desc'),
        positions: [t('prone'), t('prone'), t('prone'), t('prone')],
        shotsPerSeries: 5,
        isDefault: true,
      },
      {
        id: 'template-default-4',
        name: t('example_template_4'),
        description: t('example_template_4_desc'),
        positions: [t('standing'), t('standing'), t('standing'), t('standing')],
        shotsPerSeries: 5,
        isDefault: true,
      },
    ];
  }

  load() {
    try {
      const saved = localStorage.getItem('b_training_templates');
      const defaultTemplates = this.getDefaultTemplates();
      if (saved) {
        const parsed = JSON.parse(saved);
        const customTemplates = parsed.filter((t) => !t.isDefault);
        this.templates = [...defaultTemplates, ...customTemplates];
      } else {
        this.templates = defaultTemplates;
      }
    } catch (e) {
      console.error('Error loading training templates:', e);
      this.templates = this.getDefaultTemplates();
    }
  }

  save() {
    const customTemplates = this.templates.filter((t) => !t.isDefault);
    localStorage.setItem('b_training_templates', JSON.stringify(customTemplates));
  }

  getAll() {
    return this.templates;
  }

  getById(id) {
    return this.templates.find((t) => t.id === id);
  }

  create(name, description, positions, shotsPerSeries = 5) {
    const template = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      positions,
      shotsPerSeries: parseInt(shotsPerSeries) || 5,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.templates.push(template);
    this.save();
    return template;
  }

  update(id, name, description, positions, shotsPerSeries = 5) {
    const template = this.getById(id);
    if (!template || template.isDefault) {
      throw new Error('Cannot update default template or template not found');
    }
    template.name = name;
    template.description = description;
    template.positions = positions;
    template.shotsPerSeries = parseInt(shotsPerSeries) || 5;
    template.updatedAt = new Date().toISOString();
    this.save();
    return template;
  }

  delete(id) {
    const template = this.getById(id);
    if (!template || template.isDefault) {
      throw new Error('Cannot delete default template or template not found');
    }
    this.templates = this.templates.filter((t) => t.id !== id);
    this.save();
  }

  duplicate(id, newName) {
    const original = this.getById(id);
    if (!original) {
      throw new Error('Template not found');
    }
    return this.create(
      newName,
      original.description,
      [...original.positions],
      original.shotsPerSeries || 5
    );
  }
}

const trainingTemplateManager = new TrainingTemplateManager();
