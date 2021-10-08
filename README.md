# TIN Budget Module
This module was designed to facilitate budget creation and evaluation for coordinating centers and external sites.

#### Schedule of Events Table
When a user opens a survey that contains the <budget_table_field\>, the module will replace the field in the survey with a table. The user can specify arms, visits, and procedures for a study. Initially, the data for arms, visits, and procedures is pulled from the REDCap project that contains the module. But after the survey is submitted, revisiting the survey will ignore the arms, visits, and procedures listed in the project's record, and instead use the data from the table that was last submitted. The data saved is used in other parts of the module, particularly for the Go/No-Go tables.

Note: If the [schedule_of_event_json] field value is deleted, the module will use the arms, visits, and procedures defined in CC event forms.

#### Creating Site Instances
When the form containing [send_to_sites] is submitted, if [send_to_sites] == '1', The TIN Budget module will create instances of the 'Event 1' event. The number of instances created is equal to the [eoi] field value for the record associated with the submitted survey.

After creating any missing instances that are needed, the module then sets their 'Event 1' form complete field values to '0' where they are empty. Then the module will fill the instance's [institution] field using [institution<i\>] value where <i\>  is the instance's instance number. For example, the 3rd instance will have it's [institution] field value set to the value of [institution3].
