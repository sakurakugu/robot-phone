#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SparkMdns, NSObject)

RCT_EXTERN_METHOD(scan:(double)timeoutSeconds
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
