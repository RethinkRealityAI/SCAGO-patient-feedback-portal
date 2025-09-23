'use server';
import { config } from 'dotenv';
config();

// All Genkit flow files should be imported here.
import './flows/analyze-feedback-flow';
import './flows/chat-with-data-flow';
import './flows/generate-report-flow';
