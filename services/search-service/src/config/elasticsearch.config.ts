import { registerAs } from '@nestjs/config'

export const elasticsearchConfig = registerAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
}))
