import { Module } from '@nestjs/common';
import { BullBoardModule } from '@lysosome/bull-board-nestjs';
import { BullModule } from '@nestjs/bullmq';
import { BullMQAdapter } from '@lysosome/bull-board-api/bullMQAdapter';

// example feature module, feature can be anything. eg. user module
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'feature_queue',
    }),

    //Register each queue using the `forFeature` method.
    BullBoardModule.forFeature({
      name: 'feature_queue',
      adapter: BullMQAdapter,
    }),
  ],
})
export class FeatureModule {}
